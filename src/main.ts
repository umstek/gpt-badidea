import { chat } from "./openai.js";
import getUserInput from "./user-io.js";
import {
  call,
  gptFunctionDescriptors,
  PROMPT_ENFORCE_FUNCTIONS,
} from "./functions.js";
import config from "./config.js";

const SYSTEM_BASE_PROMPT = [
  config.OPENAI_CHAT_BASE_PROMPT,
  PROMPT_ENFORCE_FUNCTIONS,
];

async function main() {
  const history: Parameters<typeof chat>[0] = [];

  const systemQuery = SYSTEM_BASE_PROMPT.join("\n");
  history.push({ role: "system", name: "system", content: systemQuery });

  const userQuery = await getUserInput("Enter command: ");
  history.push({ role: "user", name: "user", content: userQuery });

  let gptResponse = await chat(history, gptFunctionDescriptors);
  console.log(gptResponse);
  while (
    gptResponse?.message &&
    !["stop", "length", ""].includes(gptResponse.finish_reason || "")
  ) {
    history.push(gptResponse.message);

    if (gptResponse.finish_reason === "function_call") {
      const name = gptResponse.message.function_call?.name || "";
      const args = gptResponse.message?.function_call?.arguments || "{}";
      try {
        const result = await call(name, args);
        console.log(result);
        history.push({
          role: "function",
          name,
          content: `Success, result: 
${result}`,
        });
      } catch (error) {
        console.error(error);
        history.push({
          role: "system",
          name: "system",
          content: `Failed to execute function: 
${(error as Error).message}`,
        });
      }
      gptResponse = await chat(history, gptFunctionDescriptors);
      console.log(gptResponse);
    } else if (gptResponse.finish_reason === "stop") {
      const userQuery = await getUserInput("Enter command: ");
      history.push({ role: "user", name: "user", content: userQuery });
    } else {
      // TODO
      console.log("Unknown finish reason:", gptResponse.finish_reason);
      break;
    }
  }
}

main();
