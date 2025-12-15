/**
 * @file file-resources.ts
 * @description Resource provider for Tambo AI to access local files via @ mentions
 */

import type {
  ListResourceItem,
  ReadResourceResult,
} from "@tambo-ai/react";

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
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const mimeTypes: Record<string, string> = {
    // Text
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    xml: "application/xml",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    csv: "text/csv",
    // Code
    js: "text/javascript",
    jsx: "text/javascript",
    ts: "text/typescript",
    tsx: "text/typescript",
    py: "text/x-python",
    rb: "text/x-ruby",
    java: "text/x-java",
    c: "text/x-c",
    cpp: "text/x-c++",
    h: "text/x-c",
    hpp: "text/x-c++",
    go: "text/x-go",
    rs: "text/x-rust",
    swift: "text/x-swift",
    kt: "text/x-kotlin",
    scala: "text/x-scala",
    php: "text/x-php",
    sh: "text/x-shellscript",
    bash: "text/x-shellscript",
    zsh: "text/x-shellscript",
    yaml: "text/yaml",
    yml: "text/yaml",
    toml: "text/x-toml",
    sql: "text/x-sql",
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    // Documents
    pdf: "application/pdf",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Check if a file is binary (non-text)
 */
function isBinaryFile(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/octet-stream"
  );
}

/**
 * Recursively collect all files from a directory
 */
async function collectFiles(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<ListResourceItem[]> {
  const files: ListResourceItem[] = [];

  for await (const entry of dirHandle.values()) {
    const entryPath = `${basePath}/${entry.name}`;

    if (entry.kind === "file") {
      const mimeType = getMimeType(entry.name);
      files.push({
        uri: entryPath,
        name: entry.name,
        description: entryPath,
        mimeType,
      });
    } else if (entry.kind === "directory") {
      // Recursively scan subdirectories
      const subFiles = await collectFiles(entry, entryPath);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * List all available file resources, optionally filtered by search string.
 * Search matches if the path contains the search string (case-insensitive).
 */
export async function listResources(
  search?: string,
): Promise<ListResourceItem[]> {
  const folders = await getTrackedFolders();
  const allFiles: ListResourceItem[] = [];

  for (const folder of folders) {
    try {
      const files = await collectFiles(folder.handle, `/${folder.name}`);
      allFiles.push(...files);
    } catch (err) {
      console.warn(`Could not scan folder ${folder.name}:`, err);
    }
  }

  // Filter by search string if provided (contains match, case-insensitive)
  if (search) {
    const searchLower = search.toLowerCase();
    return allFiles.filter((file) =>
      file.uri.toLowerCase().includes(searchLower),
    );
  }

  return allFiles;
}

/**
 * Get the content of a specific file resource by URI.
 */
export async function getResource(
  uri: string,
): Promise<ReadResourceResult> {
  const folders = await getTrackedFolders();

  // Parse the virtual path
  const parts = uri.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const folderName = parts[0];
  const folder = folders.find((f) => f.name === folderName);
  if (!folder) {
    throw new Error(`Folder not found: ${folderName}`);
  }

  try {
    // Navigate to the file
    let currentDir: FileSystemDirectoryHandle = folder.handle;
    for (let i = 1; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i]);
    }

    const fileName = parts[parts.length - 1];
    const fileHandle = await currentDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const mimeType = getMimeType(file.name);

    if (isBinaryFile(mimeType)) {
      // Return binary content as base64 blob
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      return {
        contents: [
          {
            uri,
            mimeType,
            blob: base64,
          },
        ],
      };
    } else {
      // Return text content
      const text = await file.text();

      return {
        contents: [
          {
            uri,
            mimeType,
            text,
          },
        ],
      };
    }
  } catch (err) {
    throw new Error(
      `Failed to read resource ${uri}: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}
