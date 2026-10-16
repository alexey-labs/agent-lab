import * as fs from "node:fs";
import path from "node:path";

/** Resolve p inside root. Throws PATH_OUTSIDE_ROOT on escape (traversal, absolute, symlink). */
export function resolveInRoot(root: string, p: string): string {
  const realRoot = fs.realpathSync(root);
  const abs = path.resolve(realRoot, p);
  let real: string;
  try {
    real = fs.realpathSync(abs);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    // New file: the file doesn't exist yet, so resolve its parent folder instead
    const realDir = fs.realpathSync(path.dirname(abs));
    real = path.join(realDir, path.basename(abs));
  }
  const rel = path.relative(realRoot, real);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`PATH_OUTSIDE_ROOT ${p} resolves outside the workspace`);
  }
  return real;
}


/** Gets the full content of a file provided by the user.
 * :param filename: The name of the file to read.
 * :return: The full content of the file. */
export function readFile(root: string, path: string): string {
  try {
    return fs.readFileSync(resolveInRoot(root, path), { encoding: "utf-8" });
  } catch (error: any) {
    return `Error: file is not found: ${JSON.stringify(error)}`
  }
}

type ListFiles = { filename: string, type?: 'file' | 'dir' }
/**
 * Lists the files in a directory provided by the user.
 * @param path The path to the directory to list files from
 * @returns A list of files in the directory as a string
 */
export function listFiles(root: string, path: string): Array<ListFiles> {
  const fullPath = resolveInRoot(root, path)
  const result: ListFiles[] = []
  if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath)
    for (const file of files) {
      result.push({
        filename: file,
        type: fs.lstatSync(fullPath + '/' + file).isFile() ? 'file' : 'dir'
      })
    }
  }
  return result.length > 0 ? result : [{
    filename: 'No files found'
  }]
}

/**
 * Replaces first occurrence of oldStr with newStr in file. If oldStr is empty, creates/overwrites file with newStr.
 * @param path The path to the file to edit
 * @param oldStr The string to replace
 * @param newStr The string to replace with
 * @returns A dictionary with the path to the file and the action taken
 */
export function editFile(root: string, path: string, oldStr: string, newStr: string): Record<string, any> {
  const fullPath = resolveInRoot(root, path)
  if (!oldStr) {
    fs.writeFileSync(fullPath, newStr, { encoding: "utf-8" })
    return {
      path: fullPath,
      action: "Created file"
    }
  } else {
    const original = readFile(root, fullPath)
    if (!original.includes(oldStr)) {
      return {
        path: fullPath,
        action: "NOT_FOUND"
      }
    }
    const occurrences = original.split(oldStr).length - 1
    if (occurrences > 1) {
      return { path: fullPath, action: "AMBIGUOUS - found multiple matches" }
    }
    const edited = original.replace(oldStr, () => newStr);
    fs.writeFileSync(fullPath, edited, { encoding: "utf-8" })
    return {
      path: fullPath,
      action: "Edited file"
    }
  }
}
