"use client";

import {
  Message,
  MessageContent,
  MessageImages,
  MessageRenderedComponentArea,
  ReasoningInfo,
  ToolcallInfo,
  type messageVariants,
} from "@/components/tambo/message";
import { cn } from "@/lib/utils";
import { type TamboThreadMessage, useTambo } from "@tambo-ai/react";
import { type VariantProps } from "class-variance-authority";
import { FileText, Sparkles, FolderOpen } from "lucide-react";
import * as React from "react";

/**
 * @typedef ThreadContentContextValue
 * @property {Array} messages - Array of message objects in the thread
 * @property {boolean} isGenerating - Whether a response is being generated
 * @property {string|undefined} generationStage - Current generation stage
 * @property {VariantProps<typeof messageVariants>["variant"]} [variant] - Optional styling variant for messages
 */
interface ThreadContentContextValue {
  messages: TamboThreadMessage[];
  isGenerating: boolean;
  generationStage?: string;
  variant?: VariantProps<typeof messageVariants>["variant"];
}

/**
 * React Context for sharing thread data among sub-components.
 * @internal
 */
const ThreadContentContext =
  React.createContext<ThreadContentContextValue | null>(null);

/**
 * Hook to access the thread content context.
 * @returns {ThreadContentContextValue} The thread content context value.
 * @throws {Error} If used outside of ThreadContent.
 * @internal
 */
const useThreadContentContext = () => {
  const context = React.useContext(ThreadContentContext);
  if (!context) {
    throw new Error(
      "ThreadContent sub-components must be used within a ThreadContent",
    );
  }
  return context;
};

/**
 * Props for the ThreadContent component.
 * Extends standard HTMLDivElement attributes.
 */
export interface ThreadContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional styling variant for the message container */
  variant?: VariantProps<typeof messageVariants>["variant"];
  /** The child elements to render within the container. */
  children?: React.ReactNode;
}

/**
 * The root container for thread content.
 * It establishes the context for its children using data from the Tambo hook.
 * @component ThreadContent
 * @example
 * ```tsx
 * <ThreadContent variant="solid">
 *   <ThreadContent.Messages />
 * </ThreadContent>
 * ```
 */
const ThreadContent = React.forwardRef<HTMLDivElement, ThreadContentProps>(
  ({ children, className, variant, ...props }, ref) => {
    const { thread, generationStage, isIdle } = useTambo();
    const isGenerating = !isIdle;

    const contextValue = React.useMemo(
      () => ({
        messages: thread?.messages ?? [],
        isGenerating,
        generationStage,
        variant,
      }),
      [thread?.messages, isGenerating, generationStage, variant],
    );

    return (
      <ThreadContentContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn("w-full", className)}
          data-slot="thread-content-container"
          {...props}
        >
          {children}
        </div>
      </ThreadContentContext.Provider>
    );
  },
);
ThreadContent.displayName = "ThreadContent";

/**
 * Welcome state component shown when there are no messages
 */
const WelcomeState = () => (
  <div className="flex flex-col items-center justify-center h-full py-16 px-4">
    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-6">
      <Sparkles className="w-10 h-10 text-white" />
    </div>
    <h2 className="text-2xl font-semibold text-slate-800 mb-2">
      Welcome to Tambo Note Taker
    </h2>
    <p className="text-slate-500 text-center max-w-md mb-8">
      Your AI-powered assistant for creating, organizing, and managing notes.
      Start by typing a message below or try one of the suggestions.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
      <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">Create Notes</span>
        <span className="text-xs text-slate-400 text-center">Capture your thoughts</span>
      </div>
      <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
          <FolderOpen className="w-5 h-5 text-emerald-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">Organize</span>
        <span className="text-xs text-slate-400 text-center">Structure your work</span>
      </div>
      <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">AI Assist</span>
        <span className="text-xs text-slate-400 text-center">Get smart help</span>
      </div>
    </div>
  </div>
);

/**
 * Props for the ThreadContentMessages component.
 * Extends standard HTMLDivElement attributes.
 */
export type ThreadContentMessagesProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Renders the list of messages in the thread.
 * Automatically connects to the context to display messages.
 * @component ThreadContent.Messages
 * @example
 * ```tsx
 * <ThreadContent>
 *   <ThreadContent.Messages />
 * </ThreadContent>
 * ```
 */
const ThreadContentMessages = React.forwardRef<
  HTMLDivElement,
  ThreadContentMessagesProps
>(({ className, ...props }, ref) => {
  const { messages, isGenerating, variant } = useThreadContentContext();

  const filteredMessages = messages.filter(
    (message) => message.role !== "system" && !message.parentMessageId,
  );

  // Show welcome state when there are no messages
  if (filteredMessages.length === 0) {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-2 h-full", className)}
        data-slot="thread-content-messages"
        {...props}
      >
        <WelcomeState />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2", className)}
      data-slot="thread-content-messages"
      {...props}
    >
      {filteredMessages.map((message, index) => {
        return (
          <div
            key={
              message.id ??
              `${message.role}-${message.createdAt ?? `${index}`}-${message.content?.toString().substring(0, 10)}`
            }
            data-slot="thread-content-item"
          >
            <Message
              role={message.role === "assistant" ? "assistant" : "user"}
              message={message}
              variant={variant}
              isLoading={isGenerating && index === filteredMessages.length - 1}
              className={cn(
                "flex w-full",
                message.role === "assistant" ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "flex flex-col",
                  message.role === "assistant" ? "w-full" : "max-w-3xl",
                )}
              >
                <ReasoningInfo />
                <MessageImages />
                <MessageContent
                  className={
                    message.role === "assistant"
                      ? "text-foreground font-sans"
                      : "text-foreground bg-container hover:bg-backdrop font-sans"
                  }
                />
                <ToolcallInfo />
                <MessageRenderedComponentArea className="w-full" />
              </div>
            </Message>
          </div>
        );
      })}
    </div>
  );
});
ThreadContentMessages.displayName = "ThreadContent.Messages";

export { ThreadContent, ThreadContentMessages };
