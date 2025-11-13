import { useRef, useEffect } from "react";
import {
  ChevronLeft,
  Instagram,
  Facebook,
  Info,
  Calendar,
  UserCheck,
  Loader2,
  Send,
} from "lucide-react";
import { Button, IconButton, MessageComposer } from "@/ui";
import MessageBubble from "./MessageBubble";
import CustomerInfoPanel from "./CustomerInfoPanel";

export default function ChatView({
  selectedContact,
  messages,
  isLoadingMessages,
  messageText,
  isSendingMessage,
  showCustomerInfo,
  textareaRef,
  isTyping,
  onBack,
  onToggleCustomerInfo,
  onConvertLead,
  onTextareaChange,
  onKeyDown,
  onSendMessage,
  isConverting,
  emitTyping,
}) {
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator on textarea change
  const handleTextareaChange = (e) => {
    onTextareaChange(e);

    // Emit typing start
    if (emitTyping) {
      emitTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false);
      }, 3000);
    }
  };

  // Stop typing indicator when sending message
  const handleSendMessage = () => {
    if (emitTyping) {
      emitTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onSendMessage();
  };

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Chat Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Mobile Back Button */}
            <button
              onClick={onBack}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            {/* Contact Avatar */}
            <div className="relative">
              {selectedContact.profile?.picture ? (
                <img
                  src={selectedContact.profile.picture}
                  alt={selectedContact.name}
                  className="w-12 h-12 rounded-full shadow-md object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md ${
                  selectedContact.profile?.picture ? "hidden" : ""
                }`}
              >
                <span className="text-white font-semibold text-lg">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {selectedContact.online && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {selectedContact.name}
              </h2>
              <div className="flex flex-col gap-0.5">
                {selectedContact.socialNetworkName && selectedContact.socialNetworkName !== selectedContact.name && (
                  <span className="text-xs text-gray-500 truncate italic">
                    @{selectedContact.socialNetworkName}
                  </span>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {selectedContact.platform === "instagram" ? (
                    <Instagram className="w-4 h-4 text-pink-600" />
                  ) : (
                    <Facebook className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="capitalize">{selectedContact.platform}</span>
                  {selectedContact.contactType === "lead" && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-600 capitalize">
                        {selectedContact.status || "Lead"}
                      </span>
                    </>
                  )}
                  {isTyping && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 italic">typing...</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedContact.contactType === "lead" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onConvertLead}
                disabled={isConverting}
                className="hidden sm:flex"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Convert
              </Button>
            )}
            <IconButton
              variant="ghost"
              size="md"
              onClick={onToggleCustomerInfo}
              className="hidden sm:flex"
            >
              <Info className="w-5 h-5" />
            </IconButton>
            <Button
              variant="luxury"
              size="sm"
              className="shadow-md hover:shadow-lg transition-all"
            >
              <Calendar className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Book</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Info Panel */}
      <CustomerInfoPanel customer={selectedContact} show={showCustomerInfo} />

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-white"
        data-messages-container
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Typing Indicator Bubble */}
            {isTyping && (
              <div className="flex items-start gap-3 mb-6 animate-fade-in">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                    <span className="text-white font-semibold text-sm">
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Composer */}
      <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
        <MessageComposer
          value={messageText}
          onChange={handleTextareaChange}
          onKeyDown={onKeyDown}
          onSend={handleSendMessage}
          isSending={isSendingMessage}
          disabled={!messageText.trim() || isSendingMessage}
          textareaRef={textareaRef}
        />
      </div>
    </>
  );
}
