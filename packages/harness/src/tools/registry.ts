import { z } from "zod"
import { editFile, listFiles, readFile } from "./file";

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
export async function callTool(tool: Tool<z.ZodObject>, input: unknown) {
  return await tool.func(tool.inputSchema.parse(input) as never)
}

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
  listFile: createTool({
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
};
