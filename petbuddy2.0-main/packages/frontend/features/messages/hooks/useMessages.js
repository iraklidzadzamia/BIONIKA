import { useState, useEffect, useRef, useCallback } from "react";
import {
  useGetConversationMessagesMutation,
  useAddMessageMutation,
  useMarkConversationReadMutation,
} from "../api";
import { useSocket } from "./useSocket";

export function useMessages({ selectedContact, platform, companyId }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [fetchMessages, { isLoading: isLoadingMessages }] =
    useGetConversationMessagesMutation();
  const [sendMessage, { isLoading: isSendingMessage }] =
    useAddMessageMutation();
  const [markAsRead] = useMarkConversationReadMutation();
  const { socket, isConnected } = useSocket();

  // Track message IDs to prevent duplicates
  const messageIdsRef = useRef(new Set());
  const typingTimeoutRef = useRef(null);
  const currentConversationIdRef = useRef(null);

  // Define callbacks before effects to avoid TDZ in dependency arrays
  const loadMessages = useCallback(async () => {
    if (!selectedContact) return;
    try {
      const result = await fetchMessages({
        contactId: selectedContact.contactId,
        platform: selectedContact.platform || platform,
      }).unwrap();

      // Map backend response to frontend format
      const mappedMessages = (result.messages || []).map((msg) => ({
        id: msg._id,
        contactId: msg.contact_id,
        content: msg.content || "",
        direction: msg.direction,
        timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
        read: msg.read || false,
        delivered: msg.delivered || false,
      }));

      // Update messages state and tracking set
      setMessages(mappedMessages);
      messageIdsRef.current = new Set(mappedMessages.map((m) => m.id));
    } catch (error) {
      console.error("[useMessages] Failed to load messages:", error);
      setMessages([]);
      messageIdsRef.current.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.contactId, platform]);

  const markMessagesAsRead = useCallback(async () => {
    if (!selectedContact || !socket) return;

    try {
      await markAsRead({
        contactId: selectedContact.contactId,
        platform: selectedContact.platform || platform,
      }).unwrap();

      // Update local state and get unread IDs
      setMessages((prev) => {
        const unreadMessageIds = prev
          .filter((msg) => msg.direction === "inbound" && !msg.read)
          .map((msg) => msg.id);

        if (unreadMessageIds.length > 0 && isConnected) {
          // Emit socket event for real-time read receipts
          socket.emit("message:read", {
            conversationId: selectedContact.contactId,
            messageIds: unreadMessageIds,
          });
        }

        // Mark messages as read
        return prev.map((msg) =>
          msg.direction === "inbound" && !msg.read
            ? { ...msg, read: true }
            : msg
        );
      });
    } catch (error) {
      console.error("[useMessages] Failed to mark messages as read:", error);
    }
  }, [selectedContact, socket, isConnected, platform, markAsRead]);

  // Join/leave conversation rooms and fetch messages when contact changes
  useEffect(() => {
    if (selectedContact?.contactId) {
      const conversationId = selectedContact.contactId;
      currentConversationIdRef.current = conversationId;

      // Load messages
      loadMessages();

      // Mark messages as read after a short delay
      const readTimeout = setTimeout(() => {
        markMessagesAsRead();
      }, 500);

      return () => {
        clearTimeout(readTimeout);
      };
    } else {
      // No contact selected, clear messages
      setMessages([]);
      messageIdsRef.current.clear();
      currentConversationIdRef.current = null;
      setIsTyping(false);
    }
  }, [selectedContact?.contactId, loadMessages, markMessagesAsRead]);

  // Handle conversation room join/leave separately
  useEffect(() => {
    if (!socket || !isConnected || !selectedContact?.contactId) return;

    const conversationId = selectedContact.contactId;

    socket.emit("conversation:join", { conversationId });

    return () => {
      socket.emit("conversation:leave", { conversationId });
    };
  }, [socket, isConnected, selectedContact?.contactId]);

  // Listen for real-time incoming messages and typing indicators
  useEffect(() => {
    if (!socket || !selectedContact || !isConnected) return;

    const conversationId = selectedContact.contactId;

    // Handler for new messages
    const handleNewMessage = (data) => {
      // Only add message if it's for the current conversation
      if (data.conversationId !== conversationId) return;

      const messageId = data.message?.id;
      if (!messageId) return;

      // Check for duplicates
      if (messageIdsRef.current.has(messageId)) return;

      // Add to tracking set
      messageIdsRef.current.add(messageId);

      // Add message to state
      setMessages((prev) => [...prev, data.message]);

      // Auto-scroll to bottom when new message arrives
      requestAnimationFrame(() => {
        const container = document.querySelector("[data-messages-container]");
        if (!container) return;

        const { scrollHeight, scrollTop, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

        // Only auto-scroll if user is near bottom or it's our own message
        if (isNearBottom || data.message.direction === "outbound") {
          container.scrollTop = scrollHeight;
        }
      });

      // Mark as read if message is inbound
      if (data.message.direction === "inbound") {
        setTimeout(() => {
          markMessagesAsRead();
        }, 1000);
      }
    };

    // Handler for typing indicators
    const handleTypingIndicator = (data) => {
      if (data.conversationId !== conversationId) return;

      setIsTyping(data.isTyping);

      // Auto-clear typing indicator after 5 seconds (fallback)
      if (data.isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 5000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    };

    // Handler for message status updates (read receipts)
    const handleMessageStatus = (data) => {
      if (data.conversationId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (data.messageIds?.includes(msg.id)) {
            return {
              ...msg,
              read: data.status === "read" || msg.read,
              delivered: true,
            };
          }
          return msg;
        })
      );
    };

    // Attach event listeners
    socket.on("message:new", handleNewMessage);
    socket.on("typing:indicator", handleTypingIndicator);
    socket.on("message:status", handleMessageStatus);

    return () => {
      // Clean up event listeners
      socket.off("message:new", handleNewMessage);
      socket.off("typing:indicator", handleTypingIndicator);
      socket.off("message:status", handleMessageStatus);

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, selectedContact, isConnected, markMessagesAsRead]);

  const handleSendMessage = useCallback(
    async (messageContent) => {
      if (!messageContent.trim() || !selectedContact || !companyId) return null;

      const optimisticId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage = {
        id: optimisticId,
        contactId: selectedContact.contactId,
        content: messageContent.trim(),
        direction: "outbound",
        timestamp: new Date(),
        read: false,
        delivered: false,
      };

      // Add optimistic message immediately
      messageIdsRef.current.add(optimisticId);
      setMessages((prev) => [...prev, optimisticMessage]);

      // Auto-scroll to show new message
      requestAnimationFrame(() => {
        const container = document.querySelector("[data-messages-container]");
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });

      try {
        const body = {
          company_id: companyId,
          contact_id: selectedContact.contactId,
          role: "operator",
          platform: selectedContact.platform || platform,
          content: messageContent.trim(),
          direction: "outbound",
        };

        const result = await sendMessage(body).unwrap();

        // Map the returned message
        const newMessage = {
          id: result.messageData._id,
          contactId: result.messageData.contact_id,
          content: result.messageData.content,
          direction: result.messageData.direction,
          timestamp: new Date(result.messageData.created_at),
          read: result.messageData.read || false,
          delivered: result.messageData.delivered || true,
        };

        // Remove optimistic ID and add real ID
        messageIdsRef.current.delete(optimisticId);
        messageIdsRef.current.add(newMessage.id);

        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticId ? newMessage : msg))
        );

        // Show warning if message was saved but not delivered to social platform
        if (result.warning) {
          console.warn(
            "[useMessages] Message delivery warning:",
            result.warning
          );
        }

        return { success: true, message: newMessage };
      } catch (error) {
        console.error("[useMessages] Failed to send message:", error);

        // Remove optimistic message on error
        messageIdsRef.current.delete(optimisticId);
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));

        throw error;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [selectedContact?.contactId, companyId, platform]
  );

  // Typing indicator function
  const emitTyping = useCallback(
    (isTyping) => {
      if (!socket || !isConnected || !selectedContact) return;

      const event = isTyping ? "typing:start" : "typing:stop";
      socket.emit(event, {
        conversationId: selectedContact.contactId,
      });
    },
    [socket, isConnected, selectedContact]
  );

  return {
    messages,
    setMessages,
    isLoadingMessages,
    isSendingMessage,
    isTyping,
    handleSendMessage,
    loadMessages,
    emitTyping,
  };
}
