"use client";

import { useRef } from "react";
type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || submittingRef.current) return;
    const form = e.currentTarget;
    const input = form.elements.namedItem("message") as HTMLTextAreaElement;
    const text = input.value.trim();
    if (!text) return;
    submittingRef.current = true;
    onSend(text);
    input.value = "";
    input.style.height = "auto";
    queueMicrotask(() => {
      submittingRef.current = false;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 items-end gap-2 border-t border-[var(--hairline)] pt-3 pb-[var(--pad-y-b)]"
    >
      <div className="crt-text flex flex-1 items-end gap-2 border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 shadow-[var(--crt-glow-small)] focus-within:border-white">
        <span className="crt-glow shrink-0 pb-px text-[13px] leading-[1.5] text-white/70 select-none">
          &gt;
        </span>
        <textarea
          name="message"
          rows={1}
          disabled={disabled}
          placeholder="SAY HI OR DROP A PRODUCT URL"
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          className="max-h-[120px] min-h-[24px] w-full flex-1 resize-none bg-transparent text-[13px] leading-[1.5] tracking-wide text-white uppercase outline-none placeholder:text-white/35 disabled:opacity-50"
          style={{ textShadow: "var(--crt-glow-small)" }}
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="crt-text flex h-[44px] shrink-0 items-center justify-center border border-white bg-black/40 px-5 text-[14px] text-white shadow-[var(--crt-glow-small)] transition-colors hover:bg-white hover:text-black hover:shadow-none disabled:cursor-wait disabled:opacity-60"
      >
        SEND
      </button>
    </form>
  );
}
