import "dotenv/config";
import { getEnvOrFail } from "@agent-lab/core";
import Anthropic from "@anthropic-ai/sdk";
import { Tool, TOOL_REGISTRY } from "../tools/registry";
import { z } from "zod";
import { MessageParam } from "@anthropic-ai/sdk/resources";
import { placeholderStr, SYSTEM_PROMPT } from "./shared";


const model = "claude-haiku-5-5"
const client = new Anthropic({
  apiKey: getEnvOrFail("ANTHROPIC_API_KEY") // This is the default and can be omitted
});

function toApiTool(tool: Tool<z.ZodObject>): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: z.toJSONSchema(tool.inputSchema) as Anthropic.Tool.InputSchema
  }
}

export async function chat(messages: MessageParam[]): Promise<string> {
  const message = await client.messages.create({
    system: SYSTEM_PROMPT.replace(placeholderStr, Object.values(TOOL_REGISTRY).map(tool => `TOOL: ===\n ${tool.name}\n${tool.description}`).join()),
    messages,
    model,
    max_tokens: 2000,
    tools: Object.values(TOOL_REGISTRY).map(toApiTool)
  });

  for (const block of message.content) {
    if (block.type === "text") {
      console.log(block.text);
    } else if (block.type === "tool_use") {
      console.log("Want to use a tool: ", block.name);
    }
  }

  return "adaw"
}
