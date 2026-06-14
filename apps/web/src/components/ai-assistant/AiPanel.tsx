import { useRef, useState } from "react";
import { Button } from "@node-red-project/ui/components/button";
import { Textarea } from "@node-red-project/ui/components/textarea";
import { Tabs, TabsList, TabsTrigger } from "@node-red-project/ui/components/tabs";
import { ScrollArea } from "@node-red-project/ui/components/scroll-area";
import { cn } from "@node-red-project/ui/lib/utils";
import { trpcClient } from "@/utils/trpc";
import { ChatMessage } from "./ChatMessage";

type AiMode = "guidance" | "qa" | "analysis";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiPanelProps {
  measurementData?: unknown;
  className?: string;
}

const MODE_LABELS: Record<AiMode, string> = {
  guidance: "操作指引",
  qa: "疑难解答",
  analysis: "数据分析",
};

export function AiPanel({ measurementData, className }: AiPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>("guidance");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }, 0);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);
    abortRef.current = false;

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...nextMessages, assistantMessage]);
    scrollToBottom();

    try {
      const stream = await trpcClient.ai.chat.mutate({
        mode,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        measurementContext:
          mode === "analysis" && measurementData
            ? JSON.stringify(measurementData)
            : undefined,
      });

      for await (const chunk of stream) {
        if (abortRef.current) break;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
        scrollToBottom();
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          const errSuffix = "\n\n_（连接中断，请重试）_";
          updated[updated.length - 1] = {
            ...last,
            content: last.content ? last.content + errSuffix : "AI 服务暂时不可用，请稍后重试。",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2", className)}>
      {isOpen && (
        <div className="flex h-[560px] w-[380px] flex-col rounded-xl border bg-background shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="font-semibold text-sm">AI 助手</span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setMessages([])}
                disabled={isStreaming || messages.length === 0}
              >
                清空
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="border-b px-4 py-2">
            <Tabs value={mode} onValueChange={(v) => setMode(v as AiMode)}>
              <TabsList className="h-7 w-full">
                {(Object.keys(MODE_LABELS) as AiMode[]).map((m) => (
                  <TabsTrigger key={m} value={m} className="flex-1 text-xs h-6">
                    {MODE_LABELS[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground mt-8">
                {mode === "guidance" && "描述你当前的操作步骤，获取指引"}
                {mode === "qa" && "描述你遇到的问题，获取解答"}
                {mode === "analysis" && "输入测量数据或问题，获取分析"}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
              className="min-h-[60px] max-h-[120px] resize-none text-sm"
              disabled={isStreaming}
            />
            <Button
              size="sm"
              className="self-end"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? "…" : "发送"}
            </Button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="text-lg">🤖</span>
      </Button>
    </div>
  );
}
