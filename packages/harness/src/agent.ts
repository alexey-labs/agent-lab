import { MessageParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources';
import { chat } from './llm/anthropic';
import { callTool, TOOL_REGISTRY, ToolCtx } from './tools/tool-registry';
import { ToolTrace, writeTrace } from './trace';
import { ASSISTANT_COLOR, RESET_COLOR } from './contants';


// TRACE FLOW:
// 1. Start a turn: note the time and the step number.
// 2. Call the model with chat(). Its response includes `usage` (token counts).
// 3. For each tool the model asked for: record the tool name, its input,
//    and the length of the output string it returned.
// 4. After the tools run (or the model finishes with no tools), write ONE line
//    to the trace log with: step, tool name(s), input, output length, usage.
// 5. Repeat until the model stops or maxSteps is reached.
// The trace writer lives in its own small file (e.g. trace.ts) so this loop
// only calls one function: writeTrace(...).
export async function runCodingAgentLoop(messages: MessageParam[], ctx: ToolCtx, maxSteps: number = 50): Promise<void> {
  // Run up to maxSteps, default 50
  for (let i = 0; i < maxSteps; i++) {
    const resp = await chat(messages);
    messages.push({ role: "assistant", content: resp.content })
    if (resp.stop_reason !== 'tool_use') {
      // Model is done: write the trace line, print its text and exit the loop.
      writeTrace({ ts: new Date().toISOString(), step: i, stop_reason: resp.stop_reason, tools: [], usage: resp.usage })
      for (const block of resp.content) {
        if (block.type === "text") {
          console.log(`\n${ASSISTANT_COLOR}Assistant:${RESET_COLOR} `, block.text)
        }
      }
      return
    }

    // Model wants tools: run each one and send all results back together.
    const toolResults: ToolResultBlockParam[] = []
    const toolTraces: ToolTrace[] = []
    for (const block of resp.content) {
      if (block.type === "tool_use") {
        console.log(`${ASSISTANT_COLOR}Using a tool:${RESET_COLOR} `, block.name, block.input);
        const tool = TOOL_REGISTRY[block.name as keyof typeof TOOL_REGISTRY]
        if (!tool) {
          // Report the error back to the model instead of crashing the session.
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true })
          toolTraces.push({ name: block.name, input: block.input, output_length: `Unknown tool: ${block.name}`.length, is_error: true })
          continue
        }
        const result = await callTool(tool, block.input, ctx)
        if (result.ok) {
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result.data })
          toolTraces.push({ name: block.name, input: block.input, output_length: result.data.length, is_error: !result.ok })
        } else {
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `${result.error.code}: ${result.error.message}`, is_error: true })
          toolTraces.push({ name: block.name, input: block.input, output_length: 0, is_error: !result.ok })
        }
      }
    }
    writeTrace({ ts: new Date().toISOString(), step: i, stop_reason: resp.stop_reason, tools: toolTraces, usage: resp.usage })
    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error(`Model reach maxSteps: ${maxSteps}`)
}
