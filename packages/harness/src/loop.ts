import { MessageParam } from '@anthropic-ai/sdk/resources';
import readline from 'node:readline';
import { chat } from './llm/antropic';

const YOU_COLOR = "\u001b[94m"
const ASSISTANT_COLOR = "\u001b[93m"
const RESET_COLOR = "\u001b[0m"

// /** TOOLS */

// function extractToolInvocation() { }

// /** LLM */

// function executeLlmCall() { }

/** AGENT LOOP */

async function runCodingAgentLoop(messages: MessageParam[]): Promise<string> {
  const reply = await chat(messages);
  return reply
}


/** USER PROMPT */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


// Prompt the user for input
function prompt() {
  const history: MessageParam[] = []
  console.log(`${ASSISTANT_COLOR}I am your assistant ask me anything${RESET_COLOR}.`)
  rl.question(`${YOU_COLOR}You:${RESET_COLOR} `, async (query: string) => {
    history.push({ role: "user", content: query })
    const reply = await runCodingAgentLoop(history)
    history.push({ role: "assistant", content: reply })
    if (reply) console.log(reply)
    console.log("----")
    prompt()
  });
}

prompt()
