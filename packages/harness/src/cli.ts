import { getEnvOrFail } from "@agent-lab/core"
import { runTask } from "./run-task"

// CLI entry: reads TASK_JSON, runs the task, prints the result, sets exit code.
async function main(): Promise<void> {
  try {
    const result = await runTask(JSON.parse(getEnvOrFail("TASK_JSON")))
    console.log(JSON.stringify(result))
    process.exitCode = 0
  } catch (error: any) {
    console.error("error", error.message)
    process.exitCode = 1
  }
}

void main()
