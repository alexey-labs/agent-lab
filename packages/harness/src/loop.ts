import { MessageParam } from '@anthropic-ai/sdk/resources';
import readline from 'node:readline';
import { runCodingAgentLoop } from './agent';
import { ASSISTANT_COLOR, RESET_COLOR, YOU_COLOR } from './contants';

/** USER PROMPT */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const history: MessageParam[] = []

// Prompt the user for input
async function prompt(argQuery?: string) {
  const ctx = { root: process.cwd() }
  // call via NPM one call - one answer
  if (argQuery) {
    history.push({ role: "user", content: argQuery })
    try {
      await runCodingAgentLoop(history, ctx)
    } catch (err) {
      console.error(`\n${ASSISTANT_COLOR}Error:${RESET_COLOR} `, err instanceof Error ? err.message : err)
    }
    console.log("\n")
    return
  }

  // Interactive chat, repeated code for NOW for v0
  rl.question(`\n${YOU_COLOR}You:${RESET_COLOR} `, async (query: string) => {
    history.push({ role: "user", content: query ?? argQuery })
    try {
      await runCodingAgentLoop(history, ctx)
    } catch (err) {
      console.error(`\n${ASSISTANT_COLOR}Error:${RESET_COLOR} `, err instanceof Error ? err.message : err)
    }
    console.log("\n")
    prompt()
  })
}

const argQuery = process.argv[2]
prompt(argQuery)
