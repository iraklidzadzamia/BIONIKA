import { Check, CheckCheck, Clock } from "lucide-react";
import { formatMessageTime } from "../../utils";

export default function MessageBubble({ message }) {
  const isOutbound = message.direction === "outbound";

  const getStatusIcon = () => {
    if (!isOutbound) return null;

    if (message.read) {
      return <CheckCheck className="w-3 h-3 text-blue-300" />;
    } else if (message.delivered) {
      return <Check className="w-3 h-3 text-blue-300" />;
    } else {
      return <Clock className="w-3 h-3 text-blue-300" />;
    }
  };

  return (
    <div
      className={`flex ${
        isOutbound ? "justify-end" : "justify-start"
      } mb-3 group`}
    >
      <div
        className={`relative max-w-[75%] sm:max-w-[70%] lg:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${
          isOutbound
            ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white"
            : "bg-white text-gray-900 border border-gray-200"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        <div
          className={`flex items-center justify-between mt-2 text-xs ${
            isOutbound ? "text-blue-100" : "text-gray-500"
          }`}
        >
          <span>{formatMessageTime(message.timestamp)}</span>
          <div className="flex items-center gap-1.5">{getStatusIcon()}</div>
        </div>
      </div>
    </div>
  );
}
