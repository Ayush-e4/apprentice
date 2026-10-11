"use client";

import { useState, type FormEvent } from "react";

// The message box at the bottom of a chat. Enter sends; the box clears on send.
export default function Composer({
  onSend,
  busy,
  placeholder,
  label,
  showLabel = false,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  placeholder: string;
  label: string;
  showLabel?: boolean;
}) {
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    onSend(q);
    setText("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="composer" className={showLabel ? "text-[0.8125rem] font-semibold" : "sr-only"}>
        {label}
      </label>
      <div className="flex">
        <input
          id="composer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 border border-ink bg-paper px-4 text-base text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-local sm:text-[0.9375rem]"
        />
        <button type="submit" className="btn btn-primary -ml-px shrink-0" disabled={busy || !text.trim()}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </div>
    </form>
  );
}
