import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveInRoot } from "./file";


let root: string;
beforeAll(() => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "jail-"));
  root = path.join(base, "repo");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/a.ts"), "x");
  fs.mkdirSync(path.join(base, "repo-evil"));
  fs.symlinkSync("/etc", path.join(root, "link"));
});

describe("resolveInRoot", () => {
  it("allows a file inside", () => expect(resolveInRoot(root, "src/a.ts")).toContain("src/a.ts"));
  it("allows a new file in a real folder", () => expect(resolveInRoot(root, "src/new.ts")).toContain("src/new.ts"));
  it("blocks ../ traversal", () => expect(() => resolveInRoot(root, "../../x")).toThrow(/OUTSIDE/));
  it("blocks absolute paths", () => expect(() => resolveInRoot(root, "/etc/passwd")).toThrow(/OUTSIDE/));
  it("blocks symlink escape", () => expect(() => resolveInRoot(root, "link/passwd")).toThrow(/OUTSIDE/));
  it("blocks prefix trick", () => expect(() => resolveInRoot(root, "../repo-evil/x")).toThrow(/OUTSIDE/));
});
