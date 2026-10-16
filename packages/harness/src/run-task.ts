import { getEnvOrFail } from "@agent-lab/core"
import { MessageParam } from "@anthropic-ai/sdk/resources"
import { z } from "zod"
import { runCodingAgentLoop } from "./agent"
import { ToolCtx } from "./tools/tool-registry"

const taskSchema = z.object({
  root: z.string().optional(),
  prompt: z.string(),
})

type TASK = z.infer<typeof taskSchema>

// 1. Read the task: JSON.parse(process.env.TASK_JSON ?? "")
//    shape: { prompt: string, root?: string }  (validate with zod)
// 2. Build ctx: { root: task.root ?? process.cwd() }
// 3. Start history with one user message: task.prompt
// 4. await runCodingAgentLoop(history, ctx)   // same loop, no readline
// 5. Print the final assistant text to stdout (that's the "answer")
// 6. process.exit(0) on success; catch errors, print them, process.exit(1)
async function runTask(): Promise<void> {
  try {
    const task: TASK = taskSchema.parse(JSON.parse(getEnvOrFail("TASK_JSON")))
    const ctx: ToolCtx = { root: task.root ?? process.cwd() }
    const history: MessageParam[] = [{ role: "user", content: task.prompt }]
    await runCodingAgentLoop(history, ctx)
    console.log("")
    process.exit(0)
  } catch (error: any) {
    console.error("error", error.message)
    process.exit(1)
  }
}


runTask()
