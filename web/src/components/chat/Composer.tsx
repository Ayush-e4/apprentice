"use client";

import { useState, type FormEvent } from "react";

// The message box at the bottom of a chat. Enter sends; the box clears on send.
export default function Composer({
  onSend,
  busy,
  placeholder,
  label,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  placeholder: string;
  label: string;
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
    <form onSubmit={submit} className="flex items-end gap-2">
      <label htmlFor="composer" className="sr-only">
        {label}
      </label>
      <input
        id="composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        autoComplete="off"
        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <button type="submit" className="btn btn-primary h-[46px] px-4" disabled={busy || !text.trim()}>
        <span className="hidden sm:inline">{busy ? "Thinking…" : "Send"}</span>
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 sm:hidden" fill="currentColor">
          <path d="M3 10l14-7-5 7 5 7-14-7z" />
        </svg>
        <span className="sr-only sm:hidden">Send</span>
      </button>
    </form>
  );
}
