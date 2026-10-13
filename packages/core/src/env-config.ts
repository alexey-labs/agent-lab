export function getEnv(key: string): string | undefined {
  console.log("getEnv")
  return process.env[key];
}

export function getEnvOrFail(key: string): string {
  const value = getEnv(key)
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ENV var: ${key}`);
  }
  return value
}
