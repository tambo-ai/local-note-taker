"use client";

import type {
  FileTreeNode,
  FolderMetadata,
  TrackedFolder,
} from "@/types/file-system";
import { useCallback, useEffect, useState } from "react";

/**
 * IndexedDB database name and version
 */
const DB_NAME = "file-system-handles";
const DB_VERSION = 1;
const STORE_NAME = "folder-handles";
const METADATA_KEY = "tracked-folders-metadata";

/**
 * Open IndexedDB connection
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save a folder handle to IndexedDB
 */
async function saveFolderHandle(
  id: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a folder handle from IndexedDB
 */
async function getFolderHandle(
  id: string,
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Delete a folder handle from IndexedDB
 */
async function deleteFolderHandle(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Hook for managing file system access
 */
export function useFileSystem() {
  const [trackedFolders, setTrackedFolders] = useState<TrackedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load tracked folders from localStorage and IndexedDB on mount
   */
  useEffect(() => {
    async function loadFolders() {
      try {
        const metadataJson = localStorage.getItem(METADATA_KEY);
        if (!metadataJson) {
          setLoading(false);
          return;
        }

        const metadata: FolderMetadata[] = JSON.parse(metadataJson);
        const folders: TrackedFolder[] = [];

        for (const meta of metadata) {
          const handle = await getFolderHandle(meta.id);
          if (handle) {
            // Try to verify we still have permission
            // Note: queryPermission might not be available in all browsers/types
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const queryPermission = (handle as any).queryPermission;
              if (queryPermission) {
                const permission = await queryPermission({ mode: "readwrite" });
                if (permission && permission !== "granted") {
                  continue;
                }
              }
            } catch {
              // If queryPermission is not available, assume we have access
            }

            folders.push({
              id: meta.id,
              name: meta.name,
              handle,
              addedAt: meta.addedAt,
            });
          }
        }

        setTrackedFolders(folders);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load folders",
        );
        setLoading(false);
      }
    }

    loadFolders();
  }, []);

  /**
   * Save metadata to localStorage
   */
  const saveMetadata = useCallback((folders: TrackedFolder[]) => {
    const metadata: FolderMetadata[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      addedAt: f.addedAt,
    }));
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  }, []);

  /**
   * Add a new folder to track
   */
  const addFolder = useCallback(async () => {
    try {
      // Check if File System Access API is supported
      if (!("showDirectoryPicker" in window)) {
        setError("File System Access API is not supported in this browser");
        return;
      }

      // Show directory picker
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      // Generate unique ID
      const id = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Save to IndexedDB
      await saveFolderHandle(id, handle);

      // Create tracked folder
      const newFolder: TrackedFolder = {
        id,
        name: handle.name,
        handle,
        addedAt: Date.now(),
      };

      const updatedFolders = [...trackedFolders, newFolder];
      setTrackedFolders(updatedFolders);
      saveMetadata(updatedFolders);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled, don't show error
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to add folder",
      );
    }
  }, [trackedFolders, saveMetadata]);

  /**
   * Remove a tracked folder
   */
  const removeFolder = useCallback(
    async (id: string) => {
      try {
        await deleteFolderHandle(id);
        const updatedFolders = trackedFolders.filter((f) => f.id !== id);
        setTrackedFolders(updatedFolders);
        saveMetadata(updatedFolders);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove folder",
        );
      }
    },
    [trackedFolders, saveMetadata],
  );

  /**
   * Build file tree for a folder
   */
  const getFileTree = useCallback(
    async (folderId: string): Promise<FileTreeNode | null> => {
      const folder = trackedFolders.find((f) => f.id === folderId);
      if (!folder) return null;

      async function buildTree(
        dirHandle: FileSystemDirectoryHandle,
        basePath: string,
        folderName: string,
      ): Promise<FileTreeNode> {
        const children: FileTreeNode[] = [];

        for await (const entry of dirHandle.values()) {
          const path = `${basePath}/${entry.name}`;

          if (entry.kind === "directory") {
            // For directories, we'll lazy load on expand
            children.push({
              name: entry.name,
              path,
              type: "directory",
              children: [],
              expanded: false,
            });
          } else {
            // For files, get metadata
            const file = await entry.getFile();
            children.push({
              name: entry.name,
              path,
              type: "file",
              size: file.size,
              lastModified: file.lastModified,
            });
          }
        }

        // Sort: directories first, then files, both alphabetically
        children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        return {
          name: folderName,
          path: `/${folderName}`,
          type: "directory",
          children,
          expanded: true,
        };
      }

      try {
        return await buildTree(folder.handle, `/${folder.name}`, folder.name);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to build file tree",
        );
        return null;
      }
    },
    [trackedFolders],
  );

  /**
   * Expand a directory node by loading its children
   */
  const expandDirectory = useCallback(
    async (path: string): Promise<FileTreeNode[]> => {
      // Parse the virtual path to get folder and relative path
      const parts = path.split("/").filter(Boolean);
      if (parts.length === 0) return [];

      const folderName = parts[0];
      const folder = trackedFolders.find((f) => f.name === folderName);
      if (!folder) return [];

      try {
        // Navigate to the directory
        let currentDir = folder.handle;
        for (let i = 1; i < parts.length; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i]);
        }

        // Build children
        const children: FileTreeNode[] = [];
        for await (const entry of currentDir.values()) {
          const childPath = `${path}/${entry.name}`;

          if (entry.kind === "directory") {
            children.push({
              name: entry.name,
              path: childPath,
              type: "directory",
              children: [],
              expanded: false,
            });
          } else {
            const file = await entry.getFile();
            children.push({
              name: entry.name,
              path: childPath,
              type: "file",
              size: file.size,
              lastModified: file.lastModified,
            });
          }
        }

        // Sort: directories first, then files, both alphabetically
        children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        return children;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to expand directory",
        );
        return [];
      }
    },
    [trackedFolders],
  );

  /**
   * Get a file or directory handle from a virtual path
   */
  const getHandleFromPath = useCallback(
    async (
      path: string,
    ): Promise<FileSystemFileHandle | FileSystemDirectoryHandle | null> => {
      // Parse the virtual path
      const parts = path.split("/").filter(Boolean);
      if (parts.length === 0) return null;

      const folderName = parts[0];
      const folder = trackedFolders.find((f) => f.name === folderName);
      if (!folder) return null;

      try {
        let current: FileSystemDirectoryHandle | FileSystemFileHandle =
          folder.handle;

        // Navigate to the target
        for (let i = 1; i < parts.length; i++) {
          if (current.kind === "directory") {
            const isLastPart = i === parts.length - 1;
            try {
              // Try as directory first
              current = await current.getDirectoryHandle(parts[i]);
            } catch {
              // If that fails and it's the last part, try as file
              if (isLastPart) {
                current = await current.getFileHandle(parts[i]);
              } else {
                throw new Error(`Path not found: ${path}`);
              }
            }
          }
        }

        return current;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get handle",
        );
        return null;
      }
    },
    [trackedFolders],
  );

  return {
    trackedFolders,
    loading,
    error,
    addFolder,
    removeFolder,
    getFileTree,
    expandDirectory,
    getHandleFromPath,
  };
}
