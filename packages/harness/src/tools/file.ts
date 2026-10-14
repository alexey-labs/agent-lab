import * as fs from "node:fs";
import path from "node:path";


function resolvePath(pathStr: string): string {
  let p = pathStr
  if (!path.isAbsolute(p)) {
    p = path.resolve(process.cwd(), p);
  }
  return p;
}

export function readFile(path: string): string {
  const fileContent = fs.readFileSync(resolvePath(path), { encoding: "utf-8" });
  return fileContent
}

export function listFiles(path: string): Array<string> {
  const fullPath = resolvePath(path)
  const result: string[] = []
  if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath)
    for (const file of files) {
      if (fs.lstatSync(file).isFile()) {
        result.push(file)
      }
    }
    return files;
  };
  return result
}

export function editFile(path: string, oldStr: string, newStr: string) {
  console.log(path, oldStr, newStr)
  return "hello"
}
