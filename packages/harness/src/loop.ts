import { MessageParam } from '@anthropic-ai/sdk/resources';
import readline from 'node:readline';
import { chat } from './llm/anthropic';
import { callTool, TOOL_REGISTRY } from './tools/registry';

const YOU_COLOR = "\u001b[94m"
const ASSISTANT_COLOR = "\u001b[93m"
const RESET_COLOR = "\u001b[0m"

// function extractToolInvocation() { }

// /** LLM */

// function executeLlmCall() { }

/** AGENT LOOP */

async function runCodingAgentLoop(messages: MessageParam[]): Promise<void> {
  const resp = await chat(messages);
  console.log("resp.stop_reason: ", resp.stop_reason)

  messages.push({ role: "assistant", content: resp.content })

  if (resp.stop_reason === 'tool_use') {
    for (const block of resp.content) {
      if (block.type === "tool_use") {
        console.log(`${ASSISTANT_COLOR}Using a tool:${RESET_COLOR} `, block.name, block.input);
        const tool = Object.values(TOOL_REGISTRY).find(t => t.name === block.name)
        if (!tool) {
          throw new Error(`Unkown tool: ${block.name}`)
        }
        const result = await callTool(tool, block.input)
        messages.push(
          {
            role: 'user',
            content: [{ type: "tool_result", tool_use_id: block.id, content: result }]
          })
      }
    }
    return await runCodingAgentLoop(messages)
  }

  for (const block of resp.content) {
    if (block.type === "text") {
      console.log(`${ASSISTANT_COLOR}Assistant:${RESET_COLOR} `, block.text)
    }
  }
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
    await runCodingAgentLoop(history)
    console.log("\n")
    prompt()
  })
}



prompt()
