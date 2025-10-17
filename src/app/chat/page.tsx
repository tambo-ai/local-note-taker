"use client";

import { FileSystemSidebar } from "@/components/file-system/file-system-sidebar";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

export default function Home() {
  // Load MCP server configurations
  const mcpServers = useMcpServers();

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
    >
      <TamboMcpProvider mcpServers={mcpServers}>
        <div className="h-screen flex overflow-hidden relative">
          {/* File System Sidebar */}
          <FileSystemSidebar />

          {/* Main Chat Area - Force thread history to right side with "right" class */}
          <div className="flex-1 relative">
            <MessageThreadFull contextKey="tambo-template" className="right" />
          </div>
        </div>
      </TamboMcpProvider>
    </TamboProvider>
  );
}
