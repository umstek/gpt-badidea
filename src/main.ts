import { chat } from "./openai.js";
import getUserInput from "./user-io.js";
import {
  call,
  gptFunctionDescriptors,
  PROMPT_ENFORCE_FUNCTIONS,
  PROMPT_SHELL_STATE,
} from "./functions.js";
import config from "./config.js";
import parentLogger from "./logging.js";

const logger = parentLogger.child({
  component: "main",
});

const SYSTEM_BASE_PROMPT = [
  config.OPENAI_CHAT_BASE_PROMPT,
  PROMPT_ENFORCE_FUNCTIONS,
  PROMPT_SHELL_STATE,
].join(" ");

async function main() {
  const history: Parameters<typeof chat>[0] = [];
  logger.info({ system: SYSTEM_BASE_PROMPT });
  history.push({
    role: "system",
    /*name: "system",*/
    content: SYSTEM_BASE_PROMPT,
  });

  const { userQuery } = (await getUserInput({
    message: "What should I do? ",
    name: "userQuery",
    type: "input",
  })) as any;
  logger.info({ user: userQuery });
  history.push({ role: "user", /*name: "user",*/ content: userQuery });

  loop: for (;;) {
    const gptResponse = await chat(history, gptFunctionDescriptors);
    logger.info({ assistant: gptResponse.message.content });
    history.push(gptResponse.message);

    switch (gptResponse.finish_reason) {
      case "function_call": {
        const { name = "", arguments: args = "" } =
          gptResponse.message.function_call || {};
        try {
          const result = await call(name, args);
          logger.info({ function: name, result });
          history.push({
            role: "function",
            name,
            content: `👍

${result}`,
          });
        } catch (error) {
          logger.info({ function: name, error });
          history.push({
            role: "system",
            // name: "system",
            content: `❌

${(error as Error)?.message || error}`,
          });
        }
        break;
      }
      case "stop": {
        const { followup } = (await getUserInput({
          message: "That's it. Do you have any follow up questions? ",
          name: "followup",
          type: "confirm",
        })) as any;
        logger.info({ followup });
        if (!followup) {
          break loop;
        }

        const { userQuery } = (await getUserInput({
          message: "Ask the follow-up question. ",
          name: "userQuery",
          type: "input",
        })) as any;
        logger.info({ user: userQuery });
        history.push({ role: "user", /*name: "user",*/ content: userQuery });
        break;
      }
      case "length": {
        const { choice } = (await getUserInput({
          message:
            "Unfortunately, we exceeded the maximum allowable token count.",
          name: "choice",
          type: "select",
          choices: [
            {
              message: "Restart the session",
              name: "restart",
              value: "restart",
            },
            {
              message: "Continue with first message omitted",
              name: "omit",
              value: "omit",
            },
            {
              message: "Continue history cleared",
              name: "clear",
              value: "clear",
            },
          ],
        })) as any;
        switch (choice) {
          case "restart":
            logger.info("Restarting the session");
            break loop;
          case "omit":
            logger.info("Omitting first message");
            // Keep the system prompt, remove a question-answer pair
            history.splice(1, 2);
            break;
          case "clear":
            logger.info("Cleared history");
            // Keep the system prompt, and the last prompt
            history.splice(1, history.length - 2);
            break;
          default:
            break;
        }
        break;
      }
      default:
        logger.error("Unknown GPT finish reason");
        break loop;
    }
  }
}

await main();
