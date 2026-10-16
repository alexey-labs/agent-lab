import type { SQSEvent } from "aws-lambda"
import { runTask } from "@agent-lab/harness"

// Thin Lambda handler: first SQS record body is the task JSON.
export async function handler(event: SQSEvent) {
  const record = event.Records[0]
  if (!record) {
    return { statusCode: 400, body: JSON.stringify({ error: "no records" }) }
  }
  const result = await runTask(JSON.parse(record.body))
  return { statusCode: 200, body: JSON.stringify(result) }
}
