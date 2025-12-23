"use client";

import { FileSystemSidebar } from "@/components/file-system/file-system-sidebar";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { components, tools } from "@/lib/tambo";
import { getResource, listResources } from "@/services/file-resources";
import { TamboProvider } from "@tambo-ai/react";

const TAMBO_API_KEY = process.env.NEXT_PUBLIC_TAMBO_API_KEY;
const TAMBO_URL = process.env.NEXT_PUBLIC_TAMBO_URL;

export default function Home() {
  // Load MCP server configurations
  const mcpServers = useMcpServers();
  const apiKey = TAMBO_API_KEY?.trim();

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                Tambo Note Taker
              </h1>
              <p className="text-sm text-slate-500">
                AI-powered notes and organization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                apiKey
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {apiKey ? "Configured" : "Not configured"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File System Sidebar */}
        <FileSystemSidebar />

        {apiKey ? (
          <TamboProvider
            apiKey={apiKey}
            components={components}
            tools={tools}
            tamboUrl={TAMBO_URL}
            listResources={listResources}
            getResource={getResource}
            mcpServers={mcpServers}
            contextKey="tambo-template"
          >
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <div className="w-full max-w-4xl mx-auto h-full">
                <MessageThreadFull />
              </div>
            </div>
          </TamboProvider>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800">
                Set up your Tambo API key
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Run <code className="font-mono">npx tambo init</code> and set{" "}
                <code className="font-mono">NEXT_PUBLIC_TAMBO_API_KEY</code> in{" "}
                <code className="font-mono">.env.local</code>.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                You can also get an API key at{" "}
                <a
                  href="https://tambo.co/cli-auth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 underline underline-offset-2"
                >
                  tambo.co/cli-auth
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
