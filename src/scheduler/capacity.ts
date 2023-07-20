import type { TaskRecord } from "./worker";

interface Usage {
  count60s: number;
  usage60s: number;
  count10s: number;
  usage10s: number;
  count1s: number;
  usage1s: number;
}

/**
 * Ref: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/quota#understanding-rate-limits
 * check tpm capacity (1 min window: < tpm limit)
 * check tpm capacity (10 sec window: < (tpm - consumed)/6 if not first req)
 * check tpm capacity (1 sec window: < (tpm - consumed)/60 if not first req)
 */
export function getTokenCapacity(tokensPerMinute: number, records: TaskRecord[]): number {
  const ago60s = Date.now() - 60_000;
  const ago10s = Date.now() - 10_000;
  const ago1s = Date.now() - 1_000;

  const windowedRecords = records.reduce<Usage>(
    (result, record) => {
      if (record.startedAt > ago60s) {
        // TODO Azure does not use actual usage for throttling. Otherwise, we can switch to tokensUsed
        const usage = record.tokensDemanded;

        result.count60s++;
        result.usage60s += usage;

        if (record.startedAt > ago10s) {
          result.count10s++;
          result.usage10s += usage;

          if (record.startedAt > ago1s) {
            result.count1s++;
            result.usage1s += usage;
          }
        }
      }

      return result;
    },
    {
      count60s: 0,
      usage60s: 0,
      count10s: 0,
      usage10s: 0,
      count1s: 0,
      usage1s: 0,
    }
  );

  const capcity60s = tokensPerMinute - windowedRecords.usage60s;
  const capacity10s = windowedRecords.count10s > 0 ? tokensPerMinute / 6 - windowedRecords.usage10s : capcity60s;
  const capacity1s = windowedRecords.count1s > 0 ? tokensPerMinute / 60 - windowedRecords.usage1s : capcity60s;

  return Math.min(capacity1s, capacity10s, capcity60s);
}
