import { createInterface } from "readline/promises";

const ri = createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Asynchronously gets user input by asking a question.
 *
 * @param {string} question The question to ask the user.
 * @return {Promise<string>} A promise that resolves to the user's input as a string.
 */
async function getUserInput(question: string): Promise<string> {
  return await ri.question(question + "\n> ");
}

export default getUserInput;
