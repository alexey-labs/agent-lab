import "dotenv/config";
import { getEnvOrFail } from "@agent-lab/core";
import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources";
import { z } from "zod";
import { Tool, TOOL_REGISTRY } from "../tools/registry";
import { placeholderStr, SYSTEM_PROMPT } from "./shared";


const model = "claude-haiku-5-5"
const client = new Anthropic({
  apiKey: getEnvOrFail("ANTHROPIC_API_KEY")
});

function toApiTool(tool: Tool<z.ZodObject>): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: z.toJSONSchema(tool.inputSchema) as Anthropic.Tool.InputSchema
  }
}

export async function chat(messages: MessageParam[]): Promise<Anthropic.Messages.Message> {
  return await client.messages.create({
    system: SYSTEM_PROMPT.replace(placeholderStr, Object.values(TOOL_REGISTRY).map(tool => `TOOL: ===\n ${tool.name}\n${tool.description}`).join()),
    messages,
    model,
    max_tokens: 2000,
    tools: Object.values(TOOL_REGISTRY).map(toApiTool)
  });
}
