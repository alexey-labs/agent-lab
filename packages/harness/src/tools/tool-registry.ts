import { z } from "zod"
import { editFile, listFiles, readFile } from "./file";
import { spawnSync } from "node:child_process";

// 1. The definition links the Zod Schema to the function argument type
export interface Tool<TSchema extends z.ZodObject<any>> {
  name: string
  description: string,
  inputSchema: TSchema,
  func: (args: z.infer<TSchema>) => Promise<any> | any
}

// 2. Simple helper for clean type inference
function createTool<T extends z.ZodObject<any>>(tool: Tool<T>) {
  return tool
}

// 3. Call tool
export async function callTool(tool: Tool<z.ZodObject>, input: unknown): Promise<string> {
  const result = await tool.func(tool.inputSchema.parse(input) as never)
  return typeof result === 'string' ? result : JSON.stringify(result)
}

const GREP_MAX_RESULTS = 50

const FORBIDDEN_COMMANDS = [
  "rm",
  "sudo",
  "su",
  "shutdown",
  "reboot",
  "halt",
  "poweroff",
]

// 4. Clean, type-safe registry
export const TOOL_REGISTRY = {
  readFile: createTool({
    name: "readFile",
    description: `Gets the full content of a file provided by the user.
    :param filename: The name of the file to read.
    :return: The full content of the file.`,
    inputSchema: z.object({ filename: z.string().describe("The name of the file to read") }),
    func: async ({ filename }) => readFile(filename)
  }),
  listFiles: createTool({
    name: "listFiles",
    description: `Lists the files in a directory provided by the user.
    :param path: The path to the directory to list files from.
    :return: A list of files in the directory.`,
    inputSchema: z.object({ path: z.string().describe("The path to the directory to list files from") }),
    func: async ({ path }) => listFiles(path)
  }),
  editFile: createTool({
    name: "editFile",
    description: `Replaces first occurrence of oldStr with newStr in file. If oldStr is empty, creates/overwrites file with newStr.
    :param path: The path to the file to edit.
    :param oldStr: The string to replace.
    :param newStr: The string to replace with.
    :return: A dictionary with the path to the file and the action taken.`,
    inputSchema: z.object({
      path: z.string().describe("The path to the file to edit"),
      oldStr: z.string().describe("The string to replace"),
      newStr: z.string().describe("The string to replace with"),
    }),
    func: async ({ path, oldStr, newStr }) => editFile(path, oldStr, newStr)
  }),
  bash: createTool({
    name: "bash",
    description: `Executes a bash command provided by the user.
    :param command: The bash command to execute.
    :return: The output of the command.`,
    inputSchema: z.object({ command: z.string().describe("The bash command to execute") }),
    func: async ({ command }) => {
      if (FORBIDDEN_COMMANDS.some(cmd => command.includes(cmd))) {
        throw new Error(`Command ${command} is forbidden`)
      }
      const result = spawnSync("sh", ["-c", command], { cwd: process.cwd(), encoding: "utf-8", timeout: 20000 })
      if (result.status !== 0) {
        throw new Error(`Command ${command} failed with status ${result.status}: ${result.stderr.toString()}`)
      }
      return {
        output: result.stdout.toString(),
        error: result.stderr.toString(),
      }
    }
  }),
  grep: createTool({
    name: "grep",
    description: `Searches for a string in a file provided by the user.
    :param file: The file to search in.
    :param string: The string to search for.
    :return: The lines containing the string.`,
    inputSchema: z.object({ file: z.string().describe("The file to search in"), string: z.string().describe("The string to search for") }),
    func: async ({ file, string }) => {
      // ripgrep exit codes: 0 = matches, 1 = no matches, 2 = error
      const result = spawnSync(
        "rg",
        ["--fixed-strings", "--vimgrep", "--color", "never", "--", string, file],
        { cwd: process.cwd(), encoding: "utf-8", timeout: 20000, maxBuffer: 64 * 1024 * 1024 }
      )
      if (result.error) {
        throw new Error(`rg failed to run: ${result.error.message}`)
      }
      if (result.status === 1) {
        return ""
      }
      if (result.status !== 0) {
        throw new Error(`rg failed with status ${result.status}: ${result.stderr?.toString() ?? ""}`)
      }
      const lines = (result.stdout ?? "").split("\n").filter(line => line.length > 0)
      if (lines.length <= GREP_MAX_RESULTS) {
        return lines.join("\n")
      }
      return [
        ...lines.slice(0, GREP_MAX_RESULTS),
        `... truncated: showing first ${GREP_MAX_RESULTS} of ${lines.length} matches`,
      ].join("\n")
    }
  })
};
