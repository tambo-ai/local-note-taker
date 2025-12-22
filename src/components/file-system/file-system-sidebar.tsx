"use client";

import { FileTreeNodeComponent } from "@/components/file-system/file-tree-node";
import { useFileSystem } from "@/hooks/use-file-system";
import { fileSystemEvents } from "@/lib/file-system-events";
import type { FileTreeNode } from "@/types/file-system";
import { FolderPlus, RefreshCw, X } from "lucide-react";
import * as React from "react";

interface FileSystemSidebarProps {
  className?: string;
}

/**
 * Sidebar component for managing tracked folders and displaying file tree
 */
export function FileSystemSidebar({ className }: FileSystemSidebarProps) {
  const {
    trackedFolders,
    loading,
    error,
    addFolder,
    removeFolder,
    getFileTree,
    expandDirectory,
    refresh,
    refreshTrigger,
  } = useFileSystem();

  const [fileTrees, setFileTrees] = React.useState<
    Map<string, FileTreeNode>
  >(new Map());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Load file trees for all tracked folders
  const loadTrees = React.useCallback(async () => {
    if (trackedFolders.length === 0) return;

    setIsRefreshing(true);
    const trees = new Map<string, FileTreeNode>();
    for (const folder of trackedFolders) {
      const tree = await getFileTree(folder.id);
      if (tree) {
        trees.set(folder.id, tree);
      }
    }
    setFileTrees(trees);
    setIsRefreshing(false);
  }, [trackedFolders, getFileTree]);

  // Load trees when tracked folders change or refresh is triggered
  React.useEffect(() => {
    loadTrees();
  }, [loadTrees, refreshTrigger]);

  // Listen for file system change events
  React.useEffect(() => {
    const cleanup = fileSystemEvents.onChange(() => {
      // Refresh the file tree when changes occur
      refresh();
    });

    return cleanup;
  }, [refresh]);

  // Optional: Auto-refresh polling every 10 seconds when page is visible
  React.useEffect(() => {
    if (trackedFolders.length === 0) return;

    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      // Poll every 10 seconds
      intervalId = setInterval(() => {
        refresh();
      }, 10000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh immediately when becoming visible
        refresh();
        startPolling();
      }
    };

    // Start polling if page is visible
    if (!document.hidden) {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [trackedFolders.length, refresh]);

  const handleRemoveFolder = React.useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (
        confirm(
          "Are you sure you want to remove this folder? You can add it back later.",
        )
      ) {
        await removeFolder(id);
        setFileTrees((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [removeFolder],
  );

  return (
    <div
      className={`w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-950 ${className ?? ""}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Local Files</h2>
          <button
            onClick={refresh}
            disabled={isRefreshing || loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh file tree"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <button
          onClick={addFolder}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
        >
          <FolderPlus className="h-4 w-4" />
          Add Folder
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading folders...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && trackedFolders.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              No folders added yet
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Click &quot;Add Folder&quot; to get started
            </p>
          </div>
        </div>
      )}

      {/* Folder list */}
      {!loading && trackedFolders.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {trackedFolders.map((folder) => {
            const tree = fileTrees.get(folder.id);
            return (
              <div
                key={folder.id}
                className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                {/* Folder header */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">
                      {folder.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Added {new Date(folder.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleRemoveFolder(folder.id, e)}
                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Remove folder"
                  >
                    <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* File tree */}
                {tree && (
                  <div className="py-1">
                    {tree.children?.map((child) => (
                      <FileTreeNodeComponent
                        key={child.path}
                        node={child}
                        onExpand={expandDirectory}
                        level={0}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer info - only show when there are tracked folders */}
      {trackedFolders.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {trackedFolders.length === 1
              ? "1 folder tracked"
              : `${trackedFolders.length} folders tracked`}
          </p>
        </div>
      )}
    </div>
  );
}
