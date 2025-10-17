/**
 * @file file-system.ts
 * @description TypeScript types for File System Access API integration
 */

/**
 * Represents a tracked folder with its handle and metadata
 */
export interface TrackedFolder {
  /** Unique identifier for the folder */
  id: string;
  /** Display name of the folder (typically the folder name) */
  name: string;
  /** FileSystemDirectoryHandle for accessing the folder */
  handle: FileSystemDirectoryHandle;
  /** Timestamp when the folder was added */
  addedAt: number;
}

/**
 * Represents a node in the file tree (file or directory)
 */
export interface FileTreeNode {
  /** Name of the file or directory */
  name: string;
  /** Full virtual path in the format /<folder-name>/path/to/file */
  path: string;
  /** Type of the node */
  type: "file" | "directory";
  /** Child nodes if this is a directory */
  children?: FileTreeNode[];
  /** Whether the directory is expanded in the UI */
  expanded?: boolean;
  /** File size in bytes (only for files) */
  size?: number;
  /** Last modified timestamp (only for files) */
  lastModified?: number;
}

/**
 * Metadata stored in localStorage about tracked folders
 */
export interface FolderMetadata {
  id: string;
  name: string;
  addedAt: number;
}

/**
 * Result from a file operation
 */
export interface FileOperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Parameters for glob pattern matching
 */
export interface GlobParams {
  // Glob pattern to match (e.g., "**\/*.ts", "src/**\/*.tsx")
  pattern: string;
  // Optional: specific folder to search in (uses all if not specified)
  folderName?: string;
}

/**
 * Parameters for grep content search
 */
export interface GrepParams {
  /** Regular expression pattern to search for */
  pattern: string;
  /** Optional: specific folder to search in (uses all if not specified) */
  folderName?: string;
  /** Optional: file glob pattern to filter which files to search */
  filePattern?: string;
  /** Case insensitive search */
  ignoreCase?: boolean;
}

/**
 * Result from a grep search
 */
export interface GrepResult {
  /** Virtual path to the file */
  path: string;
  /** Line number where match was found */
  lineNumber: number;
  /** The line content */
  line: string;
  /** Column where match starts */
  column: number;
}
