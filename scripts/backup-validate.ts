import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateBackup } from "../lib/export";
const path=process.argv[2];if(!path)throw new Error("用法：npm run backup:validate -- path/to/backup.zip");
const result=await validateBackup(await readFile(resolve(path)));console.log("备份校验通过。",JSON.stringify(result.manifest,null,2));
