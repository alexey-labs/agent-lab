import "dotenv/config";

import { getEnvOrFail } from "@agent-lab/core";
import Anthropic from "@anthropic-ai/sdk";

console.log("run")

const client = new Anthropic({
  apiKey: getEnvOrFail("ANTHROPIC_API_KEY") // This is the default and can be omitted
});

const message = await client.messages.create({
  max_tokens: 2000,
  messages: [{ role: "user", content: "Hello, Claude" }],
  model: "claude-opus-5-5"
});

for (const block of message.content) {
  if (block.type === "text") {
    console.log(block.text);
  }
}
