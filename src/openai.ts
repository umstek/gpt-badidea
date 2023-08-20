import { setTimeout } from "node:timers/promises";
import OpenAI from "openai";

import config from "./config.js";
import parentLogger from "./logging.js";

const logger = parentLogger.child({
  component: "openai",
});

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

/**
 * Gets a response from OpenAI
 *
 * @param {Array.<OpenAI.Chat.CreateChatCompletionRequestMessage|OpenAI.Chat.Completions.ChatCompletionMessage>} history the chat history
 * @param {Array.<OpenAI.Chat.CompletionCreateParams.Function>|undefined} functions the functions
 * @return {Promise.<OpenAI.Chat.ChatCompletion.Choice>} the chat completion choice
 */
export const chat = async (
  history: (
    | OpenAI.Chat.CreateChatCompletionRequestMessage
    | OpenAI.Chat.Completions.ChatCompletionMessage
  )[] = [],
  functions:
    | OpenAI.Chat.CompletionCreateParams.Function[]
    | undefined = undefined
): Promise<OpenAI.Chat.ChatCompletion.Choice> => {
  logger.debug({ history, functions });

  let retries = config.OPENAI_NUM_RETRIES;
  while (retries--) {
    try {
      const response = await openai.chat.completions.create({
        model: config.OPENAI_CHAT_MODEL,
        messages: history,
        functions,
      });

      logger.debug({ completion: response.choices[0] });
      return response.choices[0];
    } catch (error: any) {
      logger.warn({
        api: { status: error.response.status, data: error.response.data },
      });
      logger.debug({ error });
      await setTimeout(2500);
    }
  }

  logger.fatal("Failed to get response from OpenAI.");
  process.exit(1);
};
