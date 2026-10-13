export function getEnv(key: string) {
  return process.env[key];
}

export function getEnvOrFail(key: string) {
  if (!process.env[key]) throw new Error(`Missing ENV var: ${key}`);
  return process.env[key];
}
