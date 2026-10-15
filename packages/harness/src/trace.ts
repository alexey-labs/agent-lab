import { appendFileSync } from "node:fs";

// Trace log file (JSONL: one JSON object per line), written in the current working directory.
const TRACE_PATH = "trace.jsonl";

export interface ToolTrace {
  name: string;
  input: unknown;
  output_length: number;
  is_error: boolean;
}

export interface UsageTrace {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
}

export interface TurnTrace {
  ts: string;
  step: number;
  stop_reason: string | null;
  tools: ToolTrace[];
  usage: UsageTrace;
}

// Append one JSON line per turn.
export function writeTrace(entry: TurnTrace): void {
  appendFileSync(TRACE_PATH, JSON.stringify(entry) + "\n");
}
