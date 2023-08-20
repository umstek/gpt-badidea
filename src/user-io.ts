import enquirer from "enquirer";

const { prompt } = enquirer;

async function getUserInput(questions: Parameters<typeof prompt>[0]) {
  return await prompt(questions);
}

export default getUserInput;
