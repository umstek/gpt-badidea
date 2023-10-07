import { ChildProcess, spawn } from "node:child_process";
import { z } from "zod";
import { nanoid } from "nanoid";

import config from "./config.js";

let session: ChildProcess | undefined = undefined;

/**
 * Retrieves the current session.
 *
 * @return {ChildProcess} The current session.
 */
function getSession(): ChildProcess {
  if (!session || session.exitCode !== null) {
    session = spawn(config.SHELL_PATH, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    session.stdin?.write("export GIT_TERMINAL_PROMPT=0\n");
  }

  return session;
}

const ECHO = "echo";
const DATE = "date";
const PWD = "pwd";

export const shellSchema = z
  .function()
  .args(
    z.object({
      command: z.string(),
    }),
  )
  .returns(
    z
      .object({
        success: z.boolean(),
        result: z.string().optional(),
        meta: z.object({ date: z.string(), pwd: z.string() }),
      })
      .promise(),
  )
  .describe(
    `Execute any ${config.SHELL_TYPE} command in a stateful shell and get the response. Must use {"command": "<command>"} JSON form.`,
  );

export type Shell = z.infer<typeof shellSchema>;

export const shell: Shell = async ({ command }) => {
  const s = getSession();
  const cid = nanoid();

  // Define the trailer strings to mark the end of the command output, and metadata
  const trailerBegin = `trailer--${cid}--begin`;
  const trailerEnd = `trailer--${cid}--end`;

  const resultPromise = new Promise<Awaited<ReturnType<Shell>>>((resolve) => {
    let out = "";
    let err = "";

    const handleData = (data: Buffer | string) => {
      out += data.toString();

      if (out.includes(trailerEnd)) {
        s.stdout?.off("data", handleData);
        s.stderr?.off("data", handleError);

        const trailerBeginPosition = out.indexOf(trailerBegin);
        const trailerEndPosition = out.indexOf(trailerEnd);
        const error = err.trim();
        const result = out.substring(0, trailerBeginPosition).trim();
        const [date, pwd] = out
          .substring(
            trailerBeginPosition + trailerBegin.length,
            trailerEndPosition,
          )
          .trim()
          .split("\n");

        resolve({
          success: !error,
          result: [result, error].filter(Boolean).join("\n"),
          meta: { date, pwd },
        });
      }
    };

    const handleError = (data: Buffer | string) => {
      err += data.toString();
    };

    s.stdout?.on("data", handleData);
    s.stderr?.on("data", handleError);
  });

  s.stdin?.write(
    `${command} ; ${ECHO} ${trailerBegin} ; ${DATE} ; ${PWD} ; ${ECHO} ${trailerEnd} \n\n`,
  );

  return resultPromise;
};
