import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import config from "./config.js";

import shellOriginal from "./shell.js";
import getUserInputOriginal from "./user-io.js";

const shellSchema = z
  .function()
  .args(z.object({ command: z.string() }))
  .returns(z.promise(z.string()))
  .describe(
    `Execute any ${config.SHELL_TYPE} command in a stateful shell and get the response`
  );

type Shell = z.infer<typeof shellSchema>;

const shell: Shell = ({ command }) => {
  return shellOriginal(command);
};

const getUserInputSchema = z
  .function()
  .args(z.object({ question: z.string() }))
  .returns(z.promise(z.string()))
  .describe("Ask a question from the user");

type GetUserInput = z.infer<typeof getUserInputSchema>;

const getUserInput: GetUserInput = async ({ question }) => {
  return getUserInputOriginal(question);
};

const unsafeEvalSchema = z
  .function()
  .args(z.object({ code: z.string() }))
  .returns(z.any())
  .describe("Evaluate any javascript expression");

type UnsafeEval = z.infer<typeof unsafeEvalSchema>;

const unsafeEval: UnsafeEval = ({ code }) => {
  return eval(code);
};

const writeTextToFileSchema = z
  .function()
  .args(z.object({ filename: z.string(), text: z.string() }))
  .returns(z.promise(z.void()))
  .describe("Write a any text/string to a file");

type WriteTextToFile = z.infer<typeof writeTextToFileSchema>;

const writeTextToFile: WriteTextToFile = async ({ filename, text }) => {
  await writeFile(filename, text);
};

const readFromTextFileSchema = z
  .function()
  .args(z.object({ filename: z.string() }))
  .returns(z.promise(z.string()))
  .describe("Read everything as a string/text from a file");

type ReadFromTextFile = z.infer<typeof readFromTextFileSchema>;

export const readFromTextFile: ReadFromTextFile = async ({ filename }) => {
  const text = await readFile(filename, "utf-8");
  return text;
};

const functionDescriptors = [
  { schema: shellSchema, implementation: shell },
  { schema: getUserInputSchema, implementation: getUserInput },
  { schema: unsafeEvalSchema, implementation: unsafeEval },
  { schema: writeTextToFileSchema, implementation: writeTextToFile },
  { schema: readFromTextFileSchema, implementation: readFromTextFile },
];

export const gptFunctionDescriptors = functionDescriptors.map(
  ({ schema, implementation }) => ({
    name: implementation.name,
    description: schema.description,
    parameters: zodToJsonSchema(schema.parameters().items[0]),
  })
);

const functionMap = Object.fromEntries(
  functionDescriptors.map(({ schema, implementation }) => [
    implementation.name,
    {
      paramsSchema: schema.parameters().items[0],
      implementation,
    },
  ])
);

/**
 * Calls a function by name with the given arguments.
 *
 * @param {string} name - The name of the function to call.
 * @param {string} args - The arguments to pass to the function in JSON format.
 * @return {Promise<any>} - A Promise that resolves to the result of the function call.
 */
export async function call(name: string, args: string): Promise<any> {
  if (name in functionMap === false) {
    throw new Error(`Function ${name} does not exist.`);
  }
  const { paramsSchema, implementation } = functionMap[name];

  const parsedArgs = paramsSchema.parse(JSON.parse(args));
  return await implementation(parsedArgs as any);
}

export const PROMPT_ENFORCE_FUNCTIONS =
  "Only use the functions you have been provided with.";
