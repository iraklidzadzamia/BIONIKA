"use client";
import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { MessageCircle } from "lucide-react";
import {
  useConvertLeadToCustomerMutation,
  useToggleBotSuspendedMutation,
} from "../api";
import { Sidebar } from "./conversations";
import { ChatView } from "./chat";
import { useDispatch } from "react-redux";
import { openModal } from "@/core/store/slices/uiSlice";
import { useConversations, useMessages, useSocket } from "../hooks";
import { filterConversations, autoResizeTextarea } from "../utils";

export function MessagesPage() {
  const dispatch = useDispatch();
  const companyId = useSelector((state) => state.auth.company?._id);

  // UI State
  const [platform, setPlatform] = useState("all");
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [contactFilter, setContactFilter] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const textareaRef = useRef(null);

  // Socket connection status
  const { isConnected, connectionError, reconnectAttempts } = useSocket();

  // Data hooks
  const {
    conversations,
    setConversations,
    updateConversation,
    isLoading: isLoadingConversations,
  } = useConversations({ companyId, platform, contactFilter });

  const {
    messages,
    isLoadingMessages,
    isSendingMessage,
    isTyping,
    handleSendMessage: sendMessageApi,
    emitTyping,
  } = useMessages({ selectedContact, platform, companyId });

  const [convertLead, { isLoading: isConverting }] =
    useConvertLeadToCustomerMutation();
  const [toggleBotSuspended, { isLoading: isTogglingBot }] =
    useToggleBotSuspendedMutation();

  const filteredConversations = filterConversations(conversations, searchQuery);

  // Event handlers
  const handleTextareaChange = (e) => {
    setMessageText(e.target.value);
    autoResizeTextarea(textareaRef);
  };

  const handleSelectConversation = (contact) => {
    setSelectedContact(contact);
    setShowMobileChat(true);
    updateConversation(contact.contactId, { unreadCount: 0 });
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedContact(null);
  };

  const handleSendMessage = async () => {
    if (
      !messageText.trim() ||
      !selectedContact ||
      !companyId ||
      isSendingMessage
    )
      return;

    const messageContent = messageText.trim();
    setMessageText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const result = await sendMessageApi(messageContent);
      if (result?.success) {
        setConversations((prev) =>
          prev.map((c) =>
            c.contactId === selectedContact.contactId
              ? {
                  ...c,
                  lastMessage: messageContent,
                  lastMessageTime: new Date(),
                }
              : c
          )
        );
      }
    } catch (error) {
      setMessageText(messageContent);
      alert(
        error?.data?.message || "Failed to send message. Please try again."
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConvertLead = async () => {
    if (!selectedContact || selectedContact.contactType !== "lead") return;
    if (
      !confirm(
        `Convert ${selectedContact.name} from Lead to Customer? This will create a customer record.`
      )
    )
      return;

    alert(
      "Lead conversion requires creating a Customer record first. This feature will be implemented with the customer creation flow."
    );
  };

  const handleOpenAIAgentModal = (contact, e) => {
    e.stopPropagation();
    dispatch(
      openModal({
        id: "AI_AGENT_CONTROL",
        props: {
          contact,
          isSaving: isTogglingBot,
          onSave: async (settings) => {
            await handleSaveAIAgentSettingsFromModal(contact, settings);
          },
        },
        ui: {
          title: "AI Agent Control",
          showClose: true,
          size: "md",
          align: "top",
          description: contact?.name || "",
        },
      })
    );
  };

  const handleSaveAIAgentSettingsFromModal = async (contact, settings) => {
    if (!contact) return;
    try {
      const result = await toggleBotSuspended({
        contactId: contact.contactId,
        contactType: contact.contactType,
        botSuspended: settings.botSuspended,
        botSuspendUntil: settings.botSuspendUntil,
      }).unwrap();

      updateConversation(contact.contactId, {
        botSuspended: result.botSuspended,
        botSuspendUntil: result.botSuspendUntil,
      });

      if (selectedContact?.contactId === contact.contactId) {
        setSelectedContact((prev) => ({
          ...prev,
          botSuspended: result.botSuspended,
          botSuspendUntil: result.botSuspendUntil,
        }));
      }
    } catch (error) {
      console.error("Failed to update AI agent settings:", error);
      alert("Failed to update AI agent settings. Please try again.");
      throw error;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-center gap-2 text-sm">
          {reconnectAttempts > 0 ? (
            <>
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-yellow-800">
                Reconnecting... (Attempt {reconnectAttempts})
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-800">
                {connectionError || "Connecting to server..."}
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
        platform={platform}
        searchQuery={searchQuery}
        contactFilter={contactFilter}
        showFilterDropdown={showFilterDropdown}
        conversations={filteredConversations}
        isLoading={isLoadingConversations}
        selectedContact={selectedContact}
        showMobileChat={showMobileChat}
        onPlatformChange={setPlatform}
        onSearchChange={setSearchQuery}
        onFilterChange={setContactFilter}
        onToggleFilterDropdown={() =>
          setShowFilterDropdown(!showFilterDropdown)
        }
        onSelectConversation={handleSelectConversation}
        onOpenAIAgentModal={handleOpenAIAgentModal}
      />

      {/* AI Agent Control Modal moved to global ModalRoot */}

      {/* Chat Area */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col bg-white`}
      >
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center px-4">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <MessageCircle className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Select a Conversation
              </h3>
              <p className="text-gray-500">
                Choose a contact from the list to start messaging
              </p>
            </div>
          </div>
        ) : (
          <ChatView
            selectedContact={selectedContact}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            messageText={messageText}
            isSendingMessage={isSendingMessage}
            isTyping={isTyping}
            showCustomerInfo={showCustomerInfo}
            textareaRef={textareaRef}
            onBack={handleBackToList}
            onToggleCustomerInfo={() => setShowCustomerInfo(!showCustomerInfo)}
            onConvertLead={handleConvertLead}
            onTextareaChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onSendMessage={handleSendMessage}
            isConverting={isConverting}
            emitTyping={emitTyping}
          />
        )}
        </div>
      </div>
    </div>
  );
}
