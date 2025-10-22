/**
 * @file file-system-tools.ts
 * @description File operation tools for Tambo AI to interact with local file system
 */

import { fileSystemEvents } from "@/lib/file-system-events";
import type { GrepParams, GrepResult } from "@/types/file-system";
import { isMatch } from "micromatch";

/**
 * Get all tracked folders from IndexedDB
 */
async function getTrackedFolders(): Promise<
  Array<{ id: string; name: string; handle: FileSystemDirectoryHandle }>
> {
  const metadataJson = localStorage.getItem("tracked-folders-metadata");
  if (!metadataJson) return [];

  const metadata = JSON.parse(metadataJson);
  const folders = [];

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("file-system-handles", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  for (const meta of metadata) {
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const transaction = db.transaction(["folder-handles"], "readonly");
        const store = transaction.objectStore("folder-handles");
        const request = store.get(meta.id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      },
    );

    if (handle) {
      folders.push({ id: meta.id, name: meta.name, handle });
    }
  }

  return folders;
}

/**
 * Parse a virtual path into folder name and relative path
 */
function parsePath(path: string): {
  folderName: string;
  relativePath: string[];
} {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Invalid path: empty path");
  }
  return {
    folderName: parts[0],
    relativePath: parts.slice(1),
  };
}

/**
 * Get a file handle from a virtual path
 */
async function getFileHandle(
  path: string,
): Promise<FileSystemFileHandle | null> {
  const folders = await getTrackedFolders();
  const { folderName, relativePath } = parsePath(path);

  const folder = folders.find((f) => f.name === folderName);
  if (!folder) {
    throw new Error(`Folder not found: ${folderName}`);
  }

  try {
    let current: FileSystemDirectoryHandle = folder.handle;

    // Navigate through directories
    for (let i = 0; i < relativePath.length - 1; i++) {
      current = await current.getDirectoryHandle(relativePath[i]);
    }

    // Get the file
    const fileName = relativePath[relativePath.length - 1];
    return await current.getFileHandle(fileName);
  } catch {
    return null;
  }
}

/**
 * Get a directory handle from a virtual path
 * Note: Currently unused but kept for future functionality
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getDirectoryHandle(
  path: string,
): Promise<FileSystemDirectoryHandle | null> {
  const folders = await getTrackedFolders();
  const { folderName, relativePath } = parsePath(path);

  const folder = folders.find((f) => f.name === folderName);
  if (!folder) {
    throw new Error(`Folder not found: ${folderName}`);
  }

  try {
    let current: FileSystemDirectoryHandle = folder.handle;

    // Navigate through directories
    for (const part of relativePath) {
      current = await current.getDirectoryHandle(part);
    }

    return current;
  } catch {
    return null;
  }
}

/**
 * Determine if a file is an image based on its extension or MIME type
 */
function isImageFile(filename: string, mimeType: string): boolean {
  const imageExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
    ".ico",
  ];
  const lowerFilename = filename.toLowerCase();
  const hasImageExt = imageExtensions.some((ext) =>
    lowerFilename.endsWith(ext),
  );
  const hasImageMime = mimeType.startsWith("image/");
  return hasImageExt || hasImageMime;
}

/**
 * Read a file's contents
 */
export async function readFile(params: {
  path: string;
  offset?: number;
  limit?: number;
  encoding?: string;
}): Promise<{
  content?: string;
  attachment?: {
    filename: string;
    mimeType: string;
    url: string;
  };
  metadata: {
    path: string;
    size: number;
    lastModified: number;
    mimeType: string;
    isImage: boolean;
    lineCount?: number;
    offset?: number;
    limit?: number;
  };
}> {
  const { path, offset = 0, limit = 2000 } = params;
  // Note: encoding parameter is reserved for future use with different encodings

  const fileHandle = await getFileHandle(path);
  if (!fileHandle) {
    throw new Error(`File not found: ${path}`);
  }

  const file = await fileHandle.getFile();
  const filename = file.name;
  const mimeType = file.type || "application/octet-stream";
  const size = file.size;
  const lastModified = file.lastModified;

  const isImage = isImageFile(filename, mimeType);

  // Handle image files
  if (isImage) {
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      attachment: {
        filename,
        mimeType,
        url: dataUrl,
      },
      metadata: {
        path,
        size,
        lastModified,
        mimeType,
        isImage: true,
      },
    };
  }

  // Handle text files
  const text = await file.text();
  const lines = text.split("\n");
  const totalLineCount = lines.length;

  // Apply offset and limit
  const startLine = Math.max(0, offset);
  const endLine = Math.min(lines.length, startLine + limit);
  const selectedLines = lines.slice(startLine, endLine);

  // Format with line numbers (cat -n format) and truncate long lines
  const formattedLines = selectedLines.map((line, index) => {
    const lineNumber = startLine + index + 1; // Line numbers start at 1
    const truncatedLine =
      line.length > 2000 ? line.substring(0, 2000) + "...[truncated]" : line;
    return `${lineNumber.toString().padStart(6)}→${truncatedLine}`;
  });

  const content = formattedLines.join("\n");

  return {
    content,
    metadata: {
      path,
      size,
      lastModified,
      mimeType,
      isImage: false,
      lineCount: totalLineCount,
      offset: startLine,
      limit: endLine - startLine,
    },
  };
}

/**
 * Write content to a file (creates or overwrites)
 */
export async function writeFile(params: {
  path: string;
  content: string;
}): Promise<{ success: boolean; message: string }> {
  const { path, content } = params;
  const folders = await getTrackedFolders();
  const { folderName, relativePath } = parsePath(path);

  const folder = folders.find((f) => f.name === folderName);
  if (!folder) {
    throw new Error(`Folder not found: ${folderName}`);
  }

  try {
    let current: FileSystemDirectoryHandle = folder.handle;

    // Check if file exists before writing
    const fileName = relativePath[relativePath.length - 1];
    let fileExists = false;
    try {
      let checkDir = current;
      for (let i = 0; i < relativePath.length - 1; i++) {
        checkDir = await checkDir.getDirectoryHandle(relativePath[i]);
      }
      await checkDir.getFileHandle(fileName);
      fileExists = true;
    } catch {
      // File doesn't exist
    }

    // Navigate/create directories
    for (let i = 0; i < relativePath.length - 1; i++) {
      current = await current.getDirectoryHandle(relativePath[i], {
        create: true,
      });
    }

    // Create/overwrite the file
    const fileHandle = await current.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    // Emit change event
    fileSystemEvents.emitChange(fileExists ? "update" : "create", path);

    return {
      success: true,
      message: `Successfully wrote to ${path}`,
    };
  } catch (err) {
    throw new Error(
      `Failed to write file: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Edit a file by replacing old string with new string
 */
export async function editFile(params: {
  path: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}): Promise<{ success: boolean; message: string; replacements: number }> {
  const { path, oldString, newString, replaceAll = false } = params;

  // Read current content directly using filesystem APIs
  const fileHandle = await getFileHandle(path);
  if (!fileHandle) {
    throw new Error(`File not found: ${path}`);
  }

  const file = await fileHandle.getFile();
  const content = await file.text();

  // Perform replacement
  let newContent: string;
  let replacements = 0;

  if (replaceAll) {
    // Global replacement
    const regex = new RegExp(
      oldString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g",
    );
    newContent = content.replace(regex, () => {
      replacements++;
      return newString;
    });
  } else {
    // Single replacement
    const index = content.indexOf(oldString);
    if (index === -1) {
      throw new Error(`String not found in file: "${oldString}"`);
    }
    newContent =
      content.substring(0, index) +
      newString +
      content.substring(index + oldString.length);
    replacements = 1;
  }

  // Write back
  await writeFile({ path, content: newContent });

  // Emit change event (writeFile already emits, but we emit again for edit-specific handling)
  fileSystemEvents.emitChange("update", path);

  return {
    success: true,
    message: `Successfully replaced ${replacements} occurrence(s)`,
    replacements,
  };
}

/**
 * Find files matching a glob pattern
 */
export async function globFiles(params: {
  pattern: string;
  folderName?: string;
}): Promise<string[]> {
  const { pattern, folderName } = params;
  const folders = await getTrackedFolders();

  // Strip leading slash from folderName if present for more permissive matching
  const normalizedFolderName = folderName?.replace(/^\//, "");

  const foldersToSearch = normalizedFolderName
    ? folders.filter((f) => f.name === normalizedFolderName)
    : folders;

  if (foldersToSearch.length === 0) {
    return [];
  }

  const results: string[] = [];

  async function scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string,
    relativePath: string,
  ) {
    for await (const entry of dirHandle.values()) {
      const entryPath = `${basePath}/${entry.name}`;
      const entryRelativePath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;

      if (entry.kind === "file") {
        // Check if file matches pattern (match against relative path without folder prefix)
        if (isMatch(entryRelativePath, pattern)) {
          results.push(entryPath);
        }
      } else if (entry.kind === "directory") {
        // Recursively scan subdirectories
        await scanDirectory(entry, entryPath, entryRelativePath);
      }
    }
  }

  for (const folder of foldersToSearch) {
    await scanDirectory(folder.handle, `/${folder.name}`, "");
  }

  return results.sort();
}

/**
 * Search for text in files using regex pattern
 */
export async function grepFiles(params: GrepParams): Promise<GrepResult[]> {
  const {
    pattern,
    folderName,
    filePattern = "**/*",
    ignoreCase = false,
  } = params;
  const folders = await getTrackedFolders();

  const foldersToSearch = folderName
    ? folders.filter((f) => f.name === folderName)
    : folders;

  if (foldersToSearch.length === 0) {
    return [];
  }

  const results: GrepResult[] = [];
  const regex = new RegExp(pattern, ignoreCase ? "gi" : "g");

  async function searchDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string,
    relativePath: string,
  ) {
    for await (const entry of dirHandle.values()) {
      const entryPath = `${basePath}/${entry.name}`;
      const entryRelativePath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;

      if (entry.kind === "file") {
        // Check if file matches the file pattern (match against relative path without folder prefix)
        if (!isMatch(entryRelativePath, filePattern)) {
          continue;
        }

        try {
          const file = await entry.getFile();
          const content = await file.text();
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            const matches = Array.from(line.matchAll(regex));
            matches.forEach((match) => {
              results.push({
                path: entryPath,
                lineNumber: index + 1,
                line: line,
                column: match.index ?? 0,
              });
            });
          });
        } catch (err) {
          // Skip files that can't be read as text
          console.warn(`Could not read file ${entryPath}:`, err);
        }
      } else if (entry.kind === "directory") {
        // Recursively search subdirectories
        await searchDirectory(entry, entryPath, entryRelativePath);
      }
    }
  }

  for (const folder of foldersToSearch) {
    await searchDirectory(folder.handle, `/${folder.name}`, "");
  }

  return results;
}
