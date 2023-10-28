import { describe, it, after } from "node:test";
import assert from "node:assert/strict";

import { shell, cleanup } from "./shell.js";

describe("shell", () => {
  it("should execute the command and return the result", async () => {
    const result = await shell({ command: 'echo "Hello, World!"' });
    assert.equal(result.success, true);
    assert.equal(result.result, "Hello, World!");
    assert.ok(result.meta.date);
    assert.ok(result.meta.pwd);
  });

  it("should handle errors and return the error message", async () => {
    const result = await shell({ command: "invalidcommand" });
    assert.equal(result.success, false);
    assert.ok(result.result);
    assert.match(result.result, /command not found/gi);
    assert.ok(result.meta.date);
    assert.ok(result.meta.pwd);
  });

  after(() => {
    cleanup();
  });
});
