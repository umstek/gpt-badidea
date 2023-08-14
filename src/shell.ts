import { ChildProcess, spawn } from "node:child_process";
import { nanoid } from "nanoid";

import config from "./config.js";

let session: ChildProcess | undefined = undefined;

function getSession() {
  if (!session || session.exitCode !== null) {
    session = spawn(config.SHELL_PATH, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    session.stdin?.write("export GIT_TERMINAL_PROMPT=0");
  }

  return session;
}

/**
 * Executes a shell command and returns the output as a string.
 *
 * @param {string} command The shell command to execute.
 * @return {Promise<string>} A promise that resolves with the output of the command as a string.
 */
async function shell(command: string): Promise<string> {
  const s = getSession();
  const cid = `--${nanoid()}--`;

  const resultPromise = new Promise<string>((resolve, reject) => {
    let response = "";

    const handleData = (data: any) => {
      response += data.toString();

      if (response.includes(cid)) {
        s.stdout?.off("data", handleData);
        s.stderr?.off("data", handleError);
        resolve(response.replace(cid, "").trim());
      }
    };

    const handleError = (data: any) => {
      s.stdout?.off("data", handleData);
      s.stderr?.off("data", handleError);
      reject(new Error(data.toString()));
    };

    s.stdout?.on("data", handleData);
    s.stderr?.on("data", handleError);
  });

  s.stdin?.write(`${command} ; echo "${cid}"\n`);
  return resultPromise;
}

export default shell;

export const PROMPT_SHELL_STATE =
  "State of the shell doesn't apply to other functions.";
