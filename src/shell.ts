import { ChildProcess, spawn } from "node:child_process";

import config from "./config.js";

let session: ChildProcess | undefined = undefined;

function getSession() {
  if (!session || session.exitCode !== null) {
    session = spawn(config.SHELL_PATH, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  session.on("close", () => {
    console.log("Shell session closed");
    session = undefined;
  });

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

  s.stdin?.write(`${command}\n`);
  s.stdin?.end();

  return new Promise<string>((resolve, reject) => {
    s.stdout?.on("data", (data) => {
      resolve(data.toString());
    });

    s.stderr?.on("data", (data) => {
      reject(new Error(data.toString()));
    });
  });
}

export default shell;
