import { config as env } from "dotenv";
import { z } from "zod";

env();

const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  OPENAI_CHAT_MODEL: z.string().default("gpt-3.5-turbo"),
  OPENAI_CHAT_BASE_PROMPT: z.string().default(""),
  SHELL_TYPE: z.string().default("Bourne Shell (sh)"),
  SHELL_PATH: z.string().default("/usr/bin/sh"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Error parsing environment variables\n", parsed.error.issues);
  process.exit(78);
}

const config = parsed.data;

export default config;
