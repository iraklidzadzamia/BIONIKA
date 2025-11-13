import React from "react";
import { Send, Loader2 } from "lucide-react";
import IconButton from "../button/IconButton";

// Modern, simple, mobile-friendly message composer
export default function MessageComposer({
  value,
  onChange,
  onKeyDown,
  onSend,
  isSending = false,
  disabled = false,
  placeholder = "Type your message...",
  textareaRef,
  containerClassName = "flex items-end gap-2 sm:gap-3",
}) {
  return (
    <div className={containerClassName}>
      {/* Input pill with inline send */}
      <div className="flex-1 min-w-0">
        <div className="relative rounded-full border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows="1"
            className="w-full bg-transparent pl-4 pr-12 sm:pr-14 py-3 sm:py-3.5 rounded-full resize-none outline-none text-[15px] leading-normal max-h-32 overflow-y-auto placeholder-gray-400"
            style={{ minHeight: "44px" }}
            aria-label="message input"
            autoComplete="off"
            autoCorrect="on"
            spellCheck={true}
          />

          <IconButton
            onClick={onSend}
            disabled={disabled}
            variant="primary"
            size="md"
            aria-label="send"
            className="rounded-full h-10 w-10 sm:h-11 sm:w-11 absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
