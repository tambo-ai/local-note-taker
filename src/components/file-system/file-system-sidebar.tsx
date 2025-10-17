"use client";

import { FileTreeNodeComponent } from "@/components/file-system/file-tree-node";
import { useFileSystem } from "@/hooks/use-file-system";
import type { FileTreeNode } from "@/types/file-system";
import { FolderPlus, X } from "lucide-react";
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
  } = useFileSystem();

  const [fileTrees, setFileTrees] = React.useState<
    Map<string, FileTreeNode>
  >(new Map());

  // Load file trees for all tracked folders
  React.useEffect(() => {
    async function loadTrees() {
      const trees = new Map<string, FileTreeNode>();
      for (const folder of trackedFolders) {
        const tree = await getFileTree(folder.id);
        if (tree) {
          trees.set(folder.id, tree);
        }
      }
      setFileTrees(trees);
    }

    if (trackedFolders.length > 0) {
      loadTrees();
    }
  }, [trackedFolders, getFileTree]);

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

      {/* Footer info */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {trackedFolders.length === 0
            ? "No folders tracked"
            : trackedFolders.length === 1
              ? "1 folder tracked"
              : `${trackedFolders.length} folders tracked`}
        </p>
      </div>
    </div>
  );
}
