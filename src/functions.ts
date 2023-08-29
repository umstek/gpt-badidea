import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import config from "./config.js";

import shellOriginal from "./shell.js";
import getUserInputOriginal from "./user-io.js";
import { browserInterface } from "./browser.js";

const browserNavigateSchema = z
  .function()
  .args(z.object({ url: z.string() }))
  .returns(z.promise(z.any()))
  .describe("Navigate to a url in a stateful browser and get the response.");

type BrowserNavigate = z.infer<typeof browserNavigateSchema>;

const browserNavigate: BrowserNavigate = async ({ url }) => {
  return browserInterface.navigate(url);
};

const browserClickSchema = z
  .function()
  .args(z.object({ selector: z.string() }))
  .returns(z.promise(z.any()))
  .describe("Click on a selector in a stateful browser and get the response.");

type BrowserClick = z.infer<typeof browserClickSchema>;

const browserClick: BrowserClick = async ({ selector }) => {
  return browserInterface.click(selector);
};

const browserTypeSchema = z
  .function()
  .args(z.object({ selector: z.string(), text: z.string() }))
  .returns(z.promise(z.any()))
  .describe(
    "Type text in a selector in a stateful browser and get the response.",
  );

type BrowserType = z.infer<typeof browserTypeSchema>;

const browserType: BrowserType = async ({ selector, text }) => {
  return browserInterface.type(selector, text);
};

const browserEvaluateSchema = z
  .function()
  .args(z.object({ expression: z.string() }))
  .returns(z.promise(z.any()))
  .describe(
    "Evaluate any javascript expression in a stateful browser and get the response. ",
  );

type BrowserEvaluate = z.infer<typeof browserEvaluateSchema>;

const browserEvaluate: BrowserEvaluate = async ({ expression }) => {
  return browserInterface.evaluate(expression);
};

// Descriptions are important, they are how GPT knows what the functions do.

const shellSchema = z
  .function()
  .args(z.object({ command: z.string() }))
  .returns(z.promise(z.string()))
  .describe(
    `Execute any ${config.SHELL_TYPE} command in a stateful shell and get the response. Must wrap your command in {"command": "<command>"} json format and make sure they won't wait for user input.`,
  );

type Shell = z.infer<typeof shellSchema>;

const shell: Shell = async ({ command }) => {
  return shellOriginal(command);
};

const getUserInputSchema = z
  .function()
  .args(z.object({ message: z.string(), name: z.string(), type: z.string() }))
  .returns(z.promise(z.any()))
  .describe(
    "Get user input. Uses enquirer under the hood so you can use many input types.",
  );

type GetUserInput = z.infer<typeof getUserInputSchema>;

const getUserInput: GetUserInput = async (prompt) => {
  return getUserInputOriginal(prompt);
};

const unsafeEvalSchema = z
  .function()
  .args(z.object({ code: z.string() }))
  .returns(z.any())
  .describe("Evaluate any javascript expression");

type UnsafeEval = z.infer<typeof unsafeEvalSchema>;

const unsafeEval: UnsafeEval = async ({ code }) => {
  return eval(code);
};

const writeTextToFileSchema = z
  .function()
  .args(z.object({ filename: z.string(), text: z.string() }))
  .returns(z.promise(z.void()))
  .describe("Write text/string to a file; OVERWRITES file if already exists.");

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
  { schema: browserNavigateSchema, implementation: browserNavigate },
  { schema: browserClickSchema, implementation: browserClick },
  { schema: browserTypeSchema, implementation: browserType },
  { schema: browserEvaluateSchema, implementation: browserEvaluate },
];

export const gptFunctionDescriptors = functionDescriptors.map(
  ({ schema, implementation }) => ({
    name: implementation.name,
    description: schema.description,
    parameters: zodToJsonSchema(schema.parameters().items[0]),
  }),
);

const functionMap = Object.fromEntries(
  functionDescriptors.map(({ schema, implementation }) => [
    implementation.name,
    {
      paramsSchema: schema.parameters().items[0],
      implementation,
    },
  ]),
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

export const PROMPT_SHELL_STATE =
  "State of the shell doesn't apply to other functions.";
