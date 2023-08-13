import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
  Configuration,
  CreateChatCompletionResponseChoicesInner,
  OpenAIApi,
} from "openai";

import config from "./config.js";

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
  console.debug("chat", history);

  const completion = await openai.createChatCompletion({
    model: config.OPENAI_CHAT_MODEL,
    messages: history,
    functions,
  });

  return completion.data.choices[0];
};
