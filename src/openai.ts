import { setTimeout } from "node:timers/promises";
import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
  Configuration,
  CreateChatCompletionResponseChoicesInner,
  OpenAIApi,
} from "openai";

import config from "./config.js";
import parentLogger from "./logging.js";

const logger = parentLogger.child({
  component: "openai",
});

const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

/**
 * Executes a chat completion using OpenAI's API.
 *
 * @param {Array.<ChatCompletionRequestMessage | ChatCompletionResponseMessage>} history The chat history including the new input.
 * @param {Array.<ChatCompletionFunctions> | undefined} functions The functions available to GPT.
 * @return {Promise.<CreateChatCompletionResponseChoicesInner>} The chat completion choice.
 */
export const chat = async (
  history: (
    | ChatCompletionRequestMessage
    | ChatCompletionResponseMessage
  )[] = [],
  functions: ChatCompletionFunctions[] | undefined = undefined
): Promise<CreateChatCompletionResponseChoicesInner> => {
  logger.debug({ history, functions });

  let retries = config.OPENAI_NUM_RETRIES;
  while (retries--) {
    try {
      const response = await openai.createChatCompletion({
        model: config.OPENAI_CHAT_MODEL,
        messages: history,
        functions,
      });

      logger.debug({ completion: response.data.choices[0] });
      return response.data.choices[0];
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
