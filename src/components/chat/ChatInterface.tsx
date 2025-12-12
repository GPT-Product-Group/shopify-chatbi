"use client";

import { useMemo, useState } from "react";
import { DataTable } from "../data/DataTable";
import { DataChart } from "../data/Chart";
import { ExportButtons } from "../data/ExportButtons";
import { normalizeRows } from "@/lib/normalize";

type Message = {
  role: "user" | "assistant";
  content: string;
  data?: unknown;
};

type ChatResponse = {
  conversationId: string;
  query: string;
  data: unknown;
  answer: string;
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastData, setLastData] = useState<unknown>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const hasData = lastData !== null && lastData !== undefined;
  const normalized = useMemo(() => normalizeRows(lastData), [lastData]);

  const handleSend = async () => {
    setErrorMsg("");
    if (!input.trim() || !shopDomain || !accessToken) {
      setErrorMsg("请填写店铺域名、Access Token 和提问内容。");
      return;
    }
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setStatus("正在生成查询...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          message: input,
          shopDomain,
          accessToken,
        }),
        // 请求流式 NDJSON
        signal: undefined,
      });

      if (!res.body) {
        const text = await res.text();
        throw new Error(text || "响应为空");
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const appendAssistant = (content: string, data?: unknown) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: content || "无解读", data },
        ]);
      };

      // 读取 NDJSON 流
      // 数据格式：{type:"status"|"query"|"data"|"answer"|"error", ...}
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload = JSON.parse(line) as Record<string, unknown>;
            switch (payload.type) {
              case "status":
                setStatus(String(payload.message ?? ""));
                break;
              case "query":
                setLastQuery(String(payload.query ?? ""));
                break;
              case "data":
                setLastData(payload.data);
                break;
              case "answer":
                appendAssistant(String(payload.answer ?? ""), payload.data);
                setLastData(payload.data ?? lastData);
                setLastQuery(String(payload.query ?? lastQuery));
                setStatus("");
                break;
              case "error":
                setErrorMsg(String(payload.message ?? "服务器错误"));
                setStatus("");
                break;
              default:
                break;
            }
          } catch (err) {
            console.error("解析流失败", err);
          }
        }
      }

      if (buffer.trim()) {
        // 处理残余行
        try {
          const payload = JSON.parse(buffer) as Record<string, unknown>;
          if (payload.type === "answer") {
            appendAssistant(String(payload.answer ?? ""), payload.data);
            setLastData(payload.data ?? lastData);
            setLastQuery(String(payload.query ?? lastQuery));
          }
        } catch (err) {
          console.error("解析残余流失败", err);
        }
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "请求异常，请检查网络或服务日志。";
      setErrorMsg(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `错误：${msg}` },
      ]);
    } finally {
      setLoading(false);
      setInput("");
      setStatus("");
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Shopify ChatBI</h1>
          <p className="text-sm text-neutral-600">
            输入店铺域名和访问令牌（私有 App 或已安装 App 的 Token），即可用自然语言查询。
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
            <span className="rounded-full bg-white px-3 py-1">示例：上个月销售额最高的产品</span>
            <span className="rounded-full bg-white px-3 py-1">最近7天退款率</span>
            <span className="rounded-full bg-white px-3 py-1">库存少于20的商品</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder="shopDomain，例如 mystore.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
            <input
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder="Shopify Admin Access Token（若已安装可留空）"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                disabled={!shopDomain}
                onClick={() => {
                  if (!shopDomain) return;
                  const url = `/api/auth/shopify/install?shop=${encodeURIComponent(
                    shopDomain,
                  )}`;
                  window.location.href = url;
                }}
              >
                去安装 OAuth
              </button>
              <input
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                placeholder="请输入问题，如：上个月销售额最高的产品？"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className="shrink-0 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? "生成中..." : "发送"}
              </button>
            </div>
          </div>
          {status && (
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
              {status}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}
          {lastQuery && (
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
              <div className="mb-1 font-semibold">GraphQL 查询</div>
              <pre className="whitespace-pre-wrap break-all text-[11px] leading-5">
                {lastQuery}
              </pre>
            </div>
          )}
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-sm font-medium text-neutral-800">对话</div>
          <div className="flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-neutral-100 text-neutral-900"
                    : "bg-emerald-50 text-emerald-900"
                }`}
              >
                <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
                  {msg.role === "user" ? "用户" : "AI"}
                </div>
                <div className="whitespace-pre-wrap leading-6">{msg.content}</div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-sm text-neutral-500">
                还没有对话，先在上方输入店铺域名、Token 和你的问题。
              </div>
            )}
          </div>
        </section>

        {hasData && (
          <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-neutral-800">数据结果</div>
              <ExportButtons
                data={normalized.rows.length ? normalized.rows : lastData}
                fileBaseName="shopify-report"
                targetElementId="chart-preview"
              />
            </div>
            <DataTable data={lastData} />
            <DataChart data={lastData} elementId="chart-preview" />
          </section>
        )}
      </div>
    </div>
  );
}
