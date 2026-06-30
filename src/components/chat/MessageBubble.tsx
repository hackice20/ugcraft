"use client";

import type { ChatMessage } from "@/lib/types";

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
};

const BAR_BLOCKS = 22;

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const filled = Math.round((pct / 100) * BAR_BLOCKS);
  const bar = "█".repeat(filled) + "░".repeat(BAR_BLOCKS - filled);
  return (
    <div
      className="crt-text crt-glow mt-2 flex items-center gap-2 text-[13px] leading-none"
      aria-label={`rendering ${pct}%`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="tracking-tighter">[{bar}]</span>
      <span className="tabular-nums">{pct.toString().padStart(3, " ")}%</span>
    </div>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="crt-text max-w-[85%] border border-[var(--hairline)] bg-white/[0.04] px-3.5 py-2 text-[12.5px] leading-relaxed text-white/90 uppercase shadow-[var(--crt-glow-small)]">
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        <div className="crt-text mb-1.5 flex items-center gap-1.5 text-[10px] opacity-50">
          <span>▌</span>
          <span>UGCRAFT</span>
        </div>
        <p
          className="crt-glow font-mono text-[13.5px] leading-relaxed break-words whitespace-pre-wrap text-white/95"
          style={{ textShadow: "0 0 6px rgba(255,255,255,0.18)" }}
        >
          {message.content}
          {isStreaming && !message.pending && <span className="crt-caret" />}
        </p>

        {message.pending && (
          <ProgressBar progress={message.progress ?? 0} />
        )}

        {message.videoUrl && (
          <div className="mt-3 inline-block border border-[var(--hairline)] bg-black p-[3px] shadow-[var(--crt-glow-small)]">
            <video
              src={message.videoUrl}
              controls
              playsInline
              className="block w-full max-w-[280px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
