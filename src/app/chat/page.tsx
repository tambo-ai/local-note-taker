"use client";

import { FileSystemSidebar } from "@/components/file-system/file-system-sidebar";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { components, tools } from "@/lib/tambo";
import { getResource, listResources } from "@/services/file-resources";
import { TamboProvider } from "@tambo-ai/react";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

export default function Home() {
  // Load MCP server configurations
  const mcpServers = useMcpServers();

  return (
    <div className="h-screen flex overflow-hidden">
      {/* File System Sidebar */}
      <FileSystemSidebar />

      <TamboProvider
        apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
        components={components}
        tools={tools}
        tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
        listResources={listResources}
        getResource={getResource}
        mcpServers={mcpServers}
      >
        <TamboMcpProvider>
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="w-full max-w-4xl mx-auto">
              <MessageThreadFull contextKey="tambo-template" />
            </div>
          </div>
        </TamboMcpProvider>
      </TamboProvider>
    </div>
  );
}
