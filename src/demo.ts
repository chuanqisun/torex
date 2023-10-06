import { getType } from ".";

const typing = getType([{ name: "a" }, { name: "b", size: 42 }], { rootName: "MyObject", scope: "root-item" });

console.log(typing);
