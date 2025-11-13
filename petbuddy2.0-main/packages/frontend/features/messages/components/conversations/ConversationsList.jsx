import { Loader2, MessageCircle, Bot, BotOff } from "lucide-react";
import ConversationItem from "./ConversationItem";
import { getContactBadge } from "../../utils";

export default function ConversationsList({
  conversations,
  isLoading,
  selectedContact,
  searchQuery,
  onSelectConversation,
  onOpenAIAgentModal,
}) {
  const formatResumeInfo = (contact) => {
    if (!contact?.botSuspended) return null;
    const untilIso = contact.botSuspendUntil;
    if (!untilIso) return null;
    const until = new Date(untilIso);
    const now = new Date();
    const diffMs = until.getTime() - now.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return null;

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    let timeLeft;
    if (days > 0) {
      timeLeft = `${days}d ${hours}h`;
    } else if (hours > 0) {
      timeLeft = `${hours}h ${minutes}m`;
    } else {
      timeLeft = `${minutes}m`;
    }

    const dateStr = until.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return { dateStr, timeLeft };
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">
          {searchQuery ? "No conversations found" : "No conversations yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((contact) => {
        const badge = getContactBadge(contact);
        return (
          <div key={contact.contactId} className="relative">
            <ConversationItem
              customer={contact}
              isSelected={selectedContact?.contactId === contact.contactId}
              onClick={() => onSelectConversation(contact)}
            />
            {/* Top-right overlays: Badge + Bot control */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                onClick={(e) => onOpenAIAgentModal(contact, e)}
                className={`p-1.5 rounded-full transition-all shadow-sm hover:shadow-md ${
                  contact.botSuspended
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-green-100 text-green-600 hover:bg-green-200"
                }`}
                title="AI Agent Control"
              >
                {contact.botSuspended ? (
                  <BotOff className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </button>
              {/* If suspended with a future resume time, show resume date and time left */}
              {(() => {
                const info = formatResumeInfo(contact);
                if (!info) return null;
                return (
                  <div
                    className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium whitespace-nowrap"
                    title={`Resumes ${info.dateStr}`}
                  >
                    <span className="uppercase tracking-wide">Resumes</span>
                    <span>•</span>
                    <span>{info.timeLeft}</span>
                  </div>
                );
              })()}
              <div
                className={`${badge.color} text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}
              >
                <badge.icon className="w-3 h-3" />
                {badge.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
