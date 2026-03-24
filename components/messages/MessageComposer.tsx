"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  onSend: (body: string) => Promise<void>;
};

export default function MessageComposer({
  disabled,
  placeholder,
  sendLabel,
  sendingLabel,
  onSend,
}: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex gap-2">
        <label htmlFor="message-composer" className="sr-only">
          {placeholder}
        </label>
        <textarea
          id="message-composer"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || sending || !text.trim()}
          className="h-11 shrink-0 self-end rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? sendingLabel : sendLabel}
        </button>
      </div>
    </div>
  );
}
