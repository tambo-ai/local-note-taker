/**
 * @file file-system-events.ts
 * @description Event system for file system changes
 */

export type FileSystemChangeType = "create" | "update" | "delete";

export interface FileSystemChangeEvent {
  type: FileSystemChangeType;
  path: string;
  timestamp: number;
}

/**
 * Custom event for file system changes
 */
class FileSystemEventEmitter extends EventTarget {
  private static instance: FileSystemEventEmitter;

  private constructor() {
    super();
  }

  static getInstance(): FileSystemEventEmitter {
    if (!FileSystemEventEmitter.instance) {
      FileSystemEventEmitter.instance = new FileSystemEventEmitter();
    }
    return FileSystemEventEmitter.instance;
  }

  /**
   * Emit a file system change event
   */
  emitChange(type: FileSystemChangeType, path: string): void {
    const event = new CustomEvent<FileSystemChangeEvent>("fileSystemChange", {
      detail: {
        type,
        path,
        timestamp: Date.now(),
      },
    });
    this.dispatchEvent(event);
  }

  /**
   * Listen for file system changes
   */
  onChange(callback: (event: FileSystemChangeEvent) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<FileSystemChangeEvent>;
      callback(customEvent.detail);
    };

    this.addEventListener("fileSystemChange", handler);

    // Return cleanup function
    return () => {
      this.removeEventListener("fileSystemChange", handler);
    };
  }
}

/**
 * Singleton instance of the file system event emitter
 */
export const fileSystemEvents = FileSystemEventEmitter.getInstance();
