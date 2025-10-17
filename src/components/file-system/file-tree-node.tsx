"use client";

import type { FileTreeNode } from "@/types/file-system";
import { ChevronRight, Copy, File, Folder, FolderOpen } from "lucide-react";
import * as React from "react";

interface FileTreeNodeProps {
  node: FileTreeNode;
  onExpand: (path: string) => Promise<FileTreeNode[]>;
  level?: number;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A recursive tree node component for displaying files and directories
 */
export function FileTreeNodeComponent({
  node,
  onExpand,
  level = 0,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = React.useState(node.expanded ?? false);
  const [children, setChildren] = React.useState<FileTreeNode[]>(
    node.children ?? [],
  );
  const [loading, setLoading] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleToggle = React.useCallback(async () => {
    if (node.type !== "directory") return;

    if (!expanded && children.length === 0) {
      // Load children
      setLoading(true);
      try {
        const loadedChildren = await onExpand(node.path);
        setChildren(loadedChildren);
        setExpanded(true);
      } catch (err) {
        console.error("Failed to load children:", err);
      } finally {
        setLoading(false);
      }
    } else {
      // Just toggle
      setExpanded(!expanded);
    }
  }, [node.type, node.path, expanded, children.length, onExpand]);

  const handleCopyPath = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(node.path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy path:", err);
      }
    },
    [node.path],
  );

  const indentStyle = {
    paddingLeft: `${level * 16}px`,
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded transition-colors relative group"
        style={indentStyle}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/collapse chevron for directories */}
        {node.type === "directory" && (
          <ChevronRight
            className={`h-4 w-4 transition-transform flex-shrink-0 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        )}
        {node.type === "file" && <div className="w-4" />}

        {/* Icon */}
        {node.type === "directory" ? (
          expanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
          )
        ) : (
          <File className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
        )}

        {/* Name */}
        <span className="text-sm truncate flex-1">{node.name}</span>

        {/* File size for files */}
        {node.type === "file" && node.size !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
            {formatFileSize(node.size)}
          </span>
        )}

        {/* Loading indicator */}
        {loading && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Loading...
          </span>
        )}

        {/* Copy button - appears on hover */}
        <button
          onClick={handleCopyPath}
          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title={copied ? "Copied!" : "Copy path"}
          aria-label="Copy file path"
        >
          <Copy
            className={`h-3.5 w-3.5 ${
              copied
                ? "text-green-600 dark:text-green-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          />
        </button>
      </div>

      {/* Children */}
      {node.type === "directory" && expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FileTreeNodeComponent
              key={child.path}
              node={child}
              onExpand={onExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
