import { MessageParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources';
import readline from 'node:readline';
import { chat } from './llm/anthropic';
import { callTool, TOOL_REGISTRY } from './tools/registry';

const YOU_COLOR = "\u001b[94m"
const ASSISTANT_COLOR = "\u001b[93m"
const RESET_COLOR = "\u001b[0m"

async function runCodingAgentLoop(messages: MessageParam[], maxSteps: number = 20): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    const resp = await chat(messages);
    messages.push({ role: "assistant", content: resp.content })
    if (resp.stop_reason !== 'tool_use') {
      // Model is done: print its text and exit the loop.
      for (const block of resp.content) {
        if (block.type === "text") {
          console.log(`${ASSISTANT_COLOR}Assistant:${RESET_COLOR} `, block.text)
        }
      }
      return
    }

    // Model wants tools: run each one and send all results back together.
    const toolResults: ToolResultBlockParam[] = []
    for (const block of resp.content) {
      if (block.type === "tool_use") {
        console.log(`${ASSISTANT_COLOR}Using a tool:${RESET_COLOR} `, block.name, block.input);
        const tool = TOOL_REGISTRY[block.name as keyof typeof TOOL_REGISTRY]
        if (!tool) {
          // Report the error back to the model instead of crashing the session.
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true })
          continue
        }
        const result = await callTool(tool, block.input)
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result })
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error(`Model reach maxSteps: ${maxSteps}`)
}


/** USER PROMPT */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const history: MessageParam[] = []

// Prompt the user for input
function prompt() {
  rl.question(`${YOU_COLOR}You:${RESET_COLOR} `, async (query: string) => {
    history.push({ role: "user", content: query })
    try {
      await runCodingAgentLoop(history)
    } catch (err) {
      console.error(`${ASSISTANT_COLOR}Error:${RESET_COLOR} `, err instanceof Error ? err.message : err)
    }
    console.log("\n")
    prompt()
  })
}



prompt()
