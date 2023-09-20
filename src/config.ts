import { config as env } from "dotenv";
import { z } from "zod";

env();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
  OPENAI_API_KEY: z.string(),
  OPENAI_CHAT_MODEL: z.string().default("gpt-3.5-turbo"),
  OPENAI_NUM_RETRIES: z.coerce.number().default(3),
  OPENAI_CHAT_BASE_PROMPT: z.string().default(""),
  SHELL_TYPE: z.string().default("Bourne Shell (sh)"),
  SHELL_PATH: z.string().default("/usr/bin/sh"),
  BROWSER: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .catch(false),
  BROWSER_HEADLESS: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .catch(false),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Can't use logger here because of circular dependency
  console.error("Error parsing environment variables\n", parsed.error.issues);
  process.exit(78);
}

const config = parsed.data;

export default config;
