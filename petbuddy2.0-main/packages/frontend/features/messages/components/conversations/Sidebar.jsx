import { Search, Instagram, Facebook, Filter, Globe } from "lucide-react";
import ConversationsList from "./ConversationsList";
import { FILTER_OPTIONS } from "../../constants";

export default function Sidebar({
  platform,
  searchQuery,
  contactFilter,
  showFilterDropdown,
  conversations,
  isLoading,
  selectedContact,
  showMobileChat,
  onPlatformChange,
  onSearchChange,
  onFilterChange,
  onToggleFilterDropdown,
  onSelectConversation,
  onOpenAIAgentModal,
}) {
  return (
    <div
      className={`${
        showMobileChat ? "hidden md:flex" : "flex"
      } w-full md:w-96 lg:w-[400px] bg-white shadow-xl flex-col border-r border-gray-200`}
    >
      {/* Sidebar Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Messages
          </h1>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={onToggleFilterDropdown}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <Filter className="w-5 h-5 text-gray-600" />
              {contactFilter !== "all" && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full"></span>
              )}
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFilterChange(option.value);
                      onToggleFilterDropdown();
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                      contactFilter === option.value
                        ? "bg-indigo-50 text-indigo-600"
                        : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* Platform Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => onPlatformChange("all")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              platform === "all"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">All</span>
          </button>
          <button
            onClick={() => onPlatformChange("instagram")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              platform === "instagram"
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Instagram className="w-4 h-4" />
            <span className="hidden sm:inline">Instagram</span>
          </button>
          <button
            onClick={() => onPlatformChange("facebook")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              platform === "facebook"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Facebook className="w-4 h-4" />
            <span className="hidden sm:inline">Facebook</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        <ConversationsList
          conversations={conversations}
          isLoading={isLoading}
          selectedContact={selectedContact}
          searchQuery={searchQuery}
          onSelectConversation={onSelectConversation}
          onOpenAIAgentModal={onOpenAIAgentModal}
        />
      </div>
    </div>
  );
}
