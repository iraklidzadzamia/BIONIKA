import { Instagram, Facebook } from "lucide-react";
import { formatTimeAgo } from "../../utils";

export default function ConversationItem({ customer, isSelected, onClick }) {
  const getPlatformIcon = () => {
    switch (customer.platform) {
      case "instagram":
        return <Instagram className="w-4 h-4 text-pink-600" />;
      case "facebook":
        return <Facebook className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const initial = customer.name.charAt(0).toUpperCase();
  const profilePicture = customer.profile?.picture;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 hover:shadow-md ${
        isSelected
          ? "bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md border-2 border-indigo-200"
          : "bg-white hover:bg-gray-50 border-2 border-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={customer.name}
              className="w-12 h-12 rounded-full shadow-md object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md ${
              profilePicture ? "hidden" : ""
            }`}
          >
            <span className="text-white font-semibold text-lg">{initial}</span>
          </div>
          {customer.online && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
          )}
          {customer.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-xs font-bold text-white">
                {customer.unreadCount}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col mb-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm">
              {customer.name}
            </h3>
            {customer.socialNetworkName && customer.socialNetworkName !== customer.name && (
              <span className="text-xs text-gray-500 truncate italic">
                @{customer.socialNetworkName}
              </span>
            )}
          </div>

          <p
            className={`text-sm line-clamp-2 mb-2 ${
              customer.unreadCount > 0
                ? "text-gray-900 font-medium"
                : "text-gray-600"
            }`}
          >
            {customer.lastMessage}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {getPlatformIcon()}
              {customer.phone && (
                <span className="text-xs text-gray-500 truncate">
                  {customer.phone}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {formatTimeAgo(customer.lastMessageTime)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
