import { dfsPack } from "../scheduler/packing";
import { createTaskManager, type Assignment, type RunFn, type ScheduleFn, type SchedulerState } from "../scheduler/scheduler";
import type { ChatInput, ChatOutput } from "./types";

export interface WorkerChatConfig {
  workers: ChatWorker[];
  verbose?: boolean;
}

export interface ProxyConfig {
  apiKey: string;
  endpoint: string;
}
export const getOpenAIJsonProxy =
  ({ apiKey, endpoint }: ProxyConfig) =>
  async (input: ChatInput) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Azure OpenAI Chat API error: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result as ChatOutput;
  };

export type ChatEngine = (input: ChatInput, demand: ChatTaskDemand) => Promise<ChatOutput>;

export function createChatEngine(config: WorkerChatConfig): ChatEngine {
  const { workers, verbose = false } = config;
  let isTicking = false;
  const taskManager = createTaskManager<ChatTask, ChatWorker>(getChatScheduler(), getChatRunner());
  taskManager.addWorker(...workers);

  const startClock = () => {
    if (isTicking) return;
    isTicking = true;
    setTimeout(gc);
  };

  function gc() {
    const now = Date.now();

    taskManager.update((prev) => ({
      ...prev,
      workers: removeWorkerExpiredTasks(prev.workers, now),
    }));

    if (verbose) {
      console.log(
        taskManager
          .getWorkers()
          .map((w) => `${w.id}: ${w.historyTasks.length}`)
          .join(" | ")
      );
    }

    if (taskManager.getTasks().length) {
      setTimeout(gc);
    } else {
      isTicking = false;
    }
  }

  const chat: ChatEngine = async (input: ChatInput, demand: ChatTaskDemand) => {
    startClock();
    return new Promise<ChatOutput>((resolve, reject) => {
      taskManager.addTask({
        id: crypto.randomUUID(),
        input,
        demand,
        retryLeft: demand.maxRetry,
        onSuccess: resolve,
        onError: reject,
      });
    });
  };

  return chat;
}

export type SimpleChatInput = Partial<ChatInput> & Pick<ChatInput, "messages">;
export function getInput(input: SimpleChatInput): ChatInput {
  return {
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 60,
    stop: "",
    ...input,
  };
}

export type DemandChatInput = Partial<ChatInput> & Pick<ChatInput, "messages" | "max_tokens">;
export function getEstimatedDemand(models: string[], input: DemandChatInput): ChatTaskDemand {
  return {
    acceptModels: models,
    totalTokens: input.max_tokens + input.messages.flatMap((msg) => msg.content.split(" ")).length * 1.5,
    maxRetry: 3,
  };
}

export interface ChatTask {
  id: string;
  input: ChatInput;
  demand: ChatTaskDemand;
  retryLeft: number;
  onSuccess: (output: ChatOutput) => void;
  onError: (error: any) => void;
}
export interface ChatWorker {
  id: string;
  proxy: OpenAIJsonProxy;
  spec: ChatWorkerSpec;
  historyTasks: {
    id: string;
    expireAt: number;
    demand: ChatTaskDemand;
  }[];
}
export type OpenAIJsonProxy = (input: ChatInput) => Promise<ChatOutput>;

export interface ChatWorkerSpec {
  models: string[];
  tokenLimit: number;
  tokenLimitWindowSize: number;
}

export interface ChatTaskDemand {
  acceptModels: string[];
  totalTokens: number;
  maxRetry: number;
}

export function getChatScheduler(): ScheduleFn<ChatTask, ChatWorker> {
  return ({ state }) => {
    const { tasks, workers } = state;
    const mutableWorkers = workers.map((w) => ({
      historyDemands: w.historyTasks.map((t) => t.demand),
      original: w,
    }));
    let mutableTasks = [...tasks];

    const assignments: Assignment[] = [];

    for (const mutableWorker of mutableWorkers) {
      if (!mutableTasks.length) break; // stop when no task left

      const affordableTasks = dfsSelectTaskIndices(mutableWorker.original, mutableTasks).map((index) => mutableTasks[index]);
      if (!affordableTasks.length) continue; // next worker when no affordable task

      mutableWorker.historyDemands.push(...affordableTasks.map((task) => task.demand));
      mutableTasks = mutableTasks.filter((task) => !affordableTasks.includes(task));
      assignments.push(...affordableTasks.map((task) => ({ task, worker: mutableWorker.original })));
    }

    return {
      assignments,
    };
  };
}

export function getChatRunner(): RunFn<ChatTask, ChatWorker> {
  return ({ assignment, state, update }) => {
    const { task, worker } = assignment;
    worker.proxy(task.input).then(task.onSuccess, (err) => {
      // on error, requeue the task
      console.log("requeued on error", err);
      if (task.retryLeft <= 0) {
        task.onError(err);
      } else {
        update((prev) => ({
          ...prev,
          tasks: addTaskToQueue(prev.tasks, { ...task, retryLeft: task.retryLeft - 1 }),
        }));
      }
    });

    // update worker and tasks based on assignment
    const updatedState: SchedulerState<ChatTask, ChatWorker> = {
      workers: addTaskToWorker(state.workers, worker.id, task, Date.now() + worker.spec.tokenLimitWindowSize),
      tasks: removeTaskFromQueue(state.tasks, task.id),
    };

    return { state: updatedState };
  };
}

function addTaskToWorker(workers: ChatWorker[], workerId: string, task: ChatTask, expireAt: number): ChatWorker[] {
  return workers.map((w) => {
    if (w.id !== workerId) return w;
    return {
      ...w,
      historyTasks: [...w.historyTasks, { id: task.id, demand: task.demand, expireAt }],
    };
  });
}

function addTaskToQueue(queue: ChatTask[], task: ChatTask): ChatTask[] {
  return [...queue.filter((t) => t.id !== task.id), task];
}

function removeTaskFromQueue(queue: ChatTask[], taskId: string): ChatTask[] {
  return queue.filter((t) => t.id !== taskId);
}

function removeWorkerExpiredTasks(workers: ChatWorker[], now: number): ChatWorker[] {
  return workers.map((w) => ({
    ...w,
    historyTasks: w.historyTasks.filter((t) => t.expireAt > now),
  }));
}

function dfsSelectTaskIndices(worker: ChatWorker, tasks: ChatTask[]) {
  const capacity = worker.spec.tokenLimit - worker.historyTasks.reduce((acc, task) => acc + task.demand.totalTokens, 0);

  const pickedIndices = dfsPack(
    capacity,
    tasks.map((task) => task.demand.totalTokens)
  );

  return pickedIndices;
}
