import { useState, useEffect, useCallback, useRef } from "react";
import { useGetUnifiedConversationsMutation } from "../api";
import { useSocket } from "./useSocket";

export function useConversations({ companyId, platform, contactFilter }) {
  const [conversations, setConversations] = useState([]);
  const [fetchConversations, { isLoading }] =
    useGetUnifiedConversationsMutation();
  const { socket, isConnected } = useSocket();

  // Track last message IDs to avoid duplicate updates
  const lastMessageIdsRef = useRef(new Map());

  // Define loadConversations before useEffects that use it
  const loadConversations = useCallback(async () => {
    if (!companyId) return;
    try {
      const body = {
        company_id: companyId,
        platform,
      };

      const result = await fetchConversations(body).unwrap();

      // Map backend response to frontend format
      const mapped = (result.conversations || []).map((conv) => ({
        id: conv.contactId,
        contactId: conv.contactId,
        contactStatus: conv.contactStatus,
        contactType: conv.contactStatus, // For backwards compatibility
        name: conv.fullName || "Unknown",
        email: conv.email || "",
        phone: conv.phone || "",
        platform: conv.platform,
        lastMessage: conv.latestMessage?.content || "",
        lastMessageTime: conv.lastMessageAt
          ? new Date(conv.lastMessageAt)
          : new Date(),
        unreadCount: conv.unreadCount || 0,
        online: false,
        leadStage: conv.leadStage,
        social: conv.social,
        profile: conv.profile,
        botSuspended: conv.botSuspended,
        botSuspendUntil: conv.botSuspendUntil,
      }));

      setConversations(mapped);

      // Clear tracking map on reload to allow fresh message updates
      lastMessageIdsRef.current.clear();
    } catch (error) {
      console.error("[useConversations] Failed to load conversations:", error);
      setConversations([]);
    }
  }, [companyId, platform, fetchConversations]);

  useEffect(() => {
    if (companyId) {
      loadConversations();
    }
  }, [platform, companyId, contactFilter, loadConversations]);

  // Listen for real-time incoming messages to update conversation list
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data) => {
      const { conversationId, message } = data;
      if (!conversationId || !message) return;

      // Use message ID for deduplication
      const messageId = message.id;
      const lastMessageId = lastMessageIdsRef.current.get(conversationId);

      // Skip if already processed
      if (lastMessageId === messageId) return;

      // Update the last processed message ID
      lastMessageIdsRef.current.set(conversationId, messageId);

      setConversations((prev) => {
        let conversationExists = false;

        // Update existing conversation
        const updated = prev.map((conv) => {
          if (conv.contactId === conversationId) {
            conversationExists = true;

            // Only increment unread count for inbound messages
            const newUnreadCount =
              message.direction === "inbound"
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0;

            return {
              ...conv,
              lastMessage: message.content,
              lastMessageTime: new Date(message.timestamp),
              unreadCount: newUnreadCount,
            };
          }
          return conv;
        });

        // If conversation doesn't exist, reload to fetch the new contact
        if (!conversationExists) {
          loadConversations();
          return prev; // Return current state, loadConversations will update it
        }

        // Sort by latest message time
        return updated.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime).getTime();
          const timeB = new Date(b.lastMessageTime).getTime();
          return timeB - timeA;
        });
      });
    };

    // Handler for message status updates (to update read status)
    const handleMessageStatus = (data) => {
      const { conversationId, status } = data;
      if (!conversationId || status !== "read") return;

      // Reset unread count when messages are marked as read
      setConversations((prev) =>
        prev.map((conv) =>
          conv.contactId === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:status", handleMessageStatus);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:status", handleMessageStatus);
    };
  }, [socket, isConnected, loadConversations]);

  const updateConversation = useCallback((contactId, updates) => {
    setConversations((prev) =>
      prev.map((c) => (c.contactId === contactId ? { ...c, ...updates } : c))
    );
  }, []);

  return {
    conversations,
    setConversations,
    updateConversation,
    loadConversations,
    isLoading,
  };
}
