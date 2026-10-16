import { MessageParam } from "@anthropic-ai/sdk/resources"
import { z } from "zod"
import { runCodingAgentLoop } from "./agent"
import { ToolCtx } from "./tools/tool-registry"

export const taskSchema = z.object({
  root: z.string().optional(),
  prompt: z.string(),
})

export type Task = z.infer<typeof taskSchema>

export type TaskResult = {
  answer: string
}

// Pure entry: validate the task, run the loop, return the final assistant text.
// No process.exit here, so callers (CLI, Lambda) decide how to exit.
export async function runTask(input: unknown): Promise<TaskResult> {
  const task: Task = taskSchema.parse(input)
  const ctx: ToolCtx = { root: task.root ?? process.cwd() }
  const history: MessageParam[] = [{ role: "user", content: task.prompt }]
  await runCodingAgentLoop(history, ctx)
  return { answer: finalText(history) }
}

function finalText(history: MessageParam[]): string {
  const last = [...history].reverse().find((m) => m.role === "assistant")
  if (!last) return ""
  if (typeof last.content === "string") return last.content
  return last.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
}
