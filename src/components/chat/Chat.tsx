"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { extractUrl } from "@/lib/chat/intent";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";

function newId(): string {
  return crypto.randomUUID();
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "yo — drop me a product url and i'll cook a ugc reel. trending ig audio, celebrity gif, the whole thing.",
};

const RENDER_STEPS: { until: number; label: string }[] = [
  { until: 22, label: "reading the site..." },
  { until: 45, label: "summarizing the product..." },
  { until: 70, label: "picking trending audio + meme gif..." },
  { until: 95, label: "rendering your reel — hang tight..." },
  { until: 100, label: "finishing up..." },
];

const RENDER_ESTIMATE_MS = 50_000;

function stepLabel(progress: number): string {
  return (
    RENDER_STEPS.find((s) => progress <= s.until)?.label ??
    RENDER_STEPS[RENDER_STEPS.length - 1].label
  );
}

function looksLikeReelRequest(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(reel|ugc|ad|promo|video)\b/.test(t) ||
    /\b(make|create|generate|cook|build)\b.*\b(for|about)\b/.test(t)
  );
}

function Clock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const fmt = () =>
      new Date()
        .toLocaleTimeString("en-GB", { hour12: false })
        .padStart(8, "0");
    setNow(fmt());
    const t = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{now}</span>;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }

  async function streamCasualReply(history: ChatMessage[], assistantId: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history.map(({ role, content }) => ({ role, content })),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      patchMessage(assistantId, { content: acc });
      scrollToBottom();
    }
  }

  async function runReelPipeline(
    payload: { url?: string; prompt?: string },
    assistantId: string,
  ) {
    const start = Date.now();
    patchMessage(assistantId, {
      pending: true,
      progress: 1,
      content: stepLabel(1),
    });
    scrollToBottom();

    const ticker = setInterval(() => {
      const elapsed = Date.now() - start;
      const eased = 1 - Math.exp(-elapsed / (RENDER_ESTIMATE_MS / 2.2));
      const progress = Math.min(95, Math.round(eased * 100));
      patchMessage(assistantId, { progress, content: stepLabel(progress) });
    }, 200);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Generation failed (${res.status})`);
      }

      const b = data.brief;
      const v = data.video ?? {};
      const audioLine = v.usedAudio
        ? `audio: ${v.audioTitle ?? `${b.audioTitle} — ${b.audioArtist}`}${v.audioSource && v.audioSource !== "none" ? ` (via ${v.audioSource})` : ""}`
        : `audio: none (couldn't resolve "${b.audioTitle}" by ${b.audioArtist})`;
      const summary = [
        `here's your reel for ${b.productName} 🎬`,
        "",
        audioLine,
        `gif: ${v.gifLabel ?? b.gifSearchQuery}`,
        `text: "${b.textOverlay}"`,
      ]
        .filter(Boolean)
        .join("\n");

      patchMessage(assistantId, {
        content: summary,
        videoUrl: data.video?.url,
        progress: 100,
        pending: false,
      });
    } finally {
      clearInterval(ticker);
      patchMessage(assistantId, { pending: false });
    }
  }

  async function handleSend(text: string) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const assistantId = newId();
    const url = extractUrl(text);
    const shouldInferBrand = !url && looksLikeReelRequest(text);

    const history = [...messages.filter((m) => m.id !== "welcome"), userMsg];
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== "welcome"),
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setIsLoading(true);
    setError(null);
    scrollToBottom();

    try {
      if (url) {
        await runReelPipeline({ url }, assistantId);
      } else if (shouldInferBrand) {
        await runReelPipeline({ prompt: text }, assistantId);
      } else {
        await streamCasualReply(history, assistantId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      patchMessage(assistantId, {
        content: `couldn't finish that — ${msg}`,
      });
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
      scrollToBottom();
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-[var(--pad-x)]">
      <header className="crt-text flex shrink-0 items-center justify-between gap-3 border-b border-[var(--hairline)] pt-[var(--pad-y-t)] pb-3 text-[13px]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="crt-glow text-[17px] leading-none">UGCRAFT</span>
          <span className="opacity-40">//</span>
          <span className="hidden truncate opacity-60 sm:inline">
            UGC REEL ENGINE
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 opacity-80">
            <span
              className={`inline-block size-[7px] rounded-full bg-white ${
                isLoading ? "animate-pulse" : ""
              }`}
              style={{ boxShadow: "var(--crt-glow-small)" }}
            />
            {isLoading ? "RENDER" : "READY"}
          </span>
          <span className="opacity-70">
            <Clock />
          </span>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="crt-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-5"
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isStreaming={
              isLoading &&
              m.role === "assistant" &&
              m.id !== "welcome" &&
              !m.videoUrl
            }
          />
        ))}
        {error && (
          <p
            className="crt-text text-center text-[12px] text-[#ff9d9d]"
            role="alert"
          >
            ! {error}
          </p>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
