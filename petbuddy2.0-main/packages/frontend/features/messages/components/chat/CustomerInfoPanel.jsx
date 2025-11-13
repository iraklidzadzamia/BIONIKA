import { Phone, Mail, Instagram, Facebook } from "lucide-react";
import { getPlatformColor } from "../../constants";

export default function CustomerInfoPanel({ customer, show }) {
  if (!show || !customer) return null;

  const getPlatformIcon = () => {
    switch (customer.platform) {
      case "instagram":
        return <Instagram className="w-4 h-4" />;
      case "facebook":
        return <Facebook className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const platformColor = getPlatformColor(customer.platform);

  return (
    <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">
        Contact Information
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact Details */}
        <div className="space-y-3">
          {customer.phone && (
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-gray-600" />
              </div>
              <span>{customer.phone}</span>
            </div>
          )}

          {customer.email && (
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-gray-600" />
              </div>
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>

        {/* Platform Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 bg-gradient-to-r ${platformColor.gradient} shadow-sm`}
            >
              {getPlatformIcon()}
              <span className="capitalize">{customer.platform}</span>
            </div>
          </div>

          {customer.online && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Online Now</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
