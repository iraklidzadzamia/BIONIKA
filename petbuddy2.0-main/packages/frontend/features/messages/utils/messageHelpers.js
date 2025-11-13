import { UserCheck, UserPlus } from "lucide-react";

// Get badge info for contact type
export const getContactBadge = (contact) => {
  if (contact.contactType === "customer") {
    return {
      label: "Customer",
      color: "bg-green-500",
      icon: UserCheck,
    };
  } else {
    // Lead
    const statusColors = {
      new: "bg-yellow-500",
      contacted: "bg-blue-500",
      qualified: "bg-purple-500",
      converted: "bg-green-500",
      lost: "bg-red-500",
    };
    return {
      label: contact.status || "Lead",
      color: statusColors[contact.status] || "bg-yellow-500",
      icon: UserPlus,
    };
  }
};

// Filter conversations by search query
export const filterConversations = (conversations, searchQuery) => {
  if (!searchQuery) return conversations;

  const query = searchQuery.toLowerCase();
  return conversations.filter(
    (c) =>
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.lastMessage?.toLowerCase().includes(query)
  );
};

// Auto-resize textarea
export const autoResizeTextarea = (textareaRef) => {
  if (textareaRef.current) {
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }
};

// Format time ago (for conversation list)
export const formatTimeAgo = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return dateObj.toLocaleDateString();
};

// Format message time (for message bubbles)
export const formatMessageTime = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
