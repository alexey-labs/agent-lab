import { spawnSync } from "node:child_process";
import { z } from "zod";
import { editFile, listFiles, readFile } from "./file";

export type ToolCtx = { root: string };
type ToolReturnSucess = { ok: true, data: any }
type ToolReturnFail = { ok: false, error: { code: string, message: string, retryable: boolean, hint: string } }
export type ToolReturn = ToolReturnSucess | ToolReturnFail

// 1. The definition links the Zod Schema to the function argument type
export interface Tool<TSchema extends z.ZodObject<any>> {
  name: string
  description: string,
  inputSchema: TSchema,
  func: (args: z.infer<TSchema>, ctx: ToolCtx) => Promise<any> | any
}

// 2. Simple helper for clean type inference
function createTool<T extends z.ZodObject<any>>(tool: Tool<T>) {
  return tool
}

// 3. Call tool
export async function callTool(tool: Tool<z.ZodObject>, input: unknown, ctx: ToolCtx): Promise<ToolReturn> {
  try {
    const result = await tool.func(tool.inputSchema.parse(input) as never, ctx)
    const capped = capOutput(typeof result === 'string' ? result : JSON.stringify(result))
    return { ok: true, data: capped }
  } catch (error: any) {
    return { ok: false, error: { code: error.code || "unknown", message: error.message, retryable: false, hint: "" } }
  }
}

// Output caps: every tool result goes through capOutput(text, 8000): keep
// head and tail, insert[truncated 12345 chars; narrow your query].
// The hint teaches the model to self - correct.
export function capOutput(text: string, maxChars: number = 8000) {
  if (text.length <= maxChars) return text;
  const halfChars = Math.floor((maxChars - 100) / 2);
  const head = text.slice(0, halfChars);
  const tail = text.slice(-halfChars, text.length)
  const truncatedText = `[truncated ${text.length - halfChars * 2} chars..., narrow your query]`
  return `${head}\n ${truncatedText}\n ${tail}`
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
    func: async ({ filename }, ctx) => readFile(ctx.root, filename)
  }),
  listFiles: createTool({
    name: "listFiles",
    description: `Lists the files in a directory provided by the user.
    :param path: The path to the directory to list files from.
    :return: A list of files in the directory.`,
    inputSchema: z.object({ path: z.string().describe("The path to the directory to list files from") }),
    func: async ({ path }, ctx) => listFiles(ctx.root, path)
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
    func: async ({ path, oldStr, newStr }, ctx) => editFile(ctx.root, path, oldStr, newStr)
  }),
  bash: createTool({
    name: "bash",
    description: `Executes a bash command provided by the user.
    :param command: The bash command to execute.
    :return: The output of the command.`,
    inputSchema: z.object({ command: z.string().describe("The bash command to execute") }),
    func: async ({ command }, ctx) => {
      if (FORBIDDEN_COMMANDS.some(cmd => command.includes(cmd))) {
        throw new Error(`Command ${command} is forbidden`)
      }
      const result = spawnSync("sh", ["-c", command], { cwd: ctx.root, encoding: "utf-8", timeout: 20000, maxBuffer: 64 * 1024 * 1024 })
      // Non-zero exits are normal tool output (e.g. failing tests), not errors.
      // A timeout is reported via `result.error` with code ETIMEDOUT; the child is killed, so status is null.
      const timedOut = (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT"
      if (result.error && !timedOut) {
        throw new Error(`Command ${command} could not run: ${result.error.message}`)
      }
      return {
        exitCode: result.status,
        stdout: capOutput(result.stdout ?? ""),
        stderr: capOutput(result.stderr ?? "", 2000),
        timedOut,
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
    func: async ({ file, string }, ctx) => {
      // ripgrep exit codes: 0 = matches, 1 = no matches, 2 = error
      const result = spawnSync(
        "rg",
        ["--fixed-strings", "--vimgrep", "--color", "never", "--", string, file],
        { cwd: ctx.root, encoding: "utf-8", timeout: 20000, maxBuffer: 64 * 1024 * 1024 }
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
