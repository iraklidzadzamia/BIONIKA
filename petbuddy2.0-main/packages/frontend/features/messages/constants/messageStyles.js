// Modern color system and styles for messages components

// Platform colors
export const PLATFORM_COLORS = {
  instagram: {
    gradient: "from-pink-500 to-purple-600",
    solid: "bg-pink-500",
    text: "text-pink-600",
    icon: "text-pink-600",
    hover: "hover:bg-pink-50",
  },
  facebook: {
    gradient: "from-blue-500 to-blue-600",
    solid: "bg-blue-500",
    text: "text-blue-600",
    icon: "text-blue-600",
    hover: "hover:bg-blue-50",
  },
};

// Contact type badge styles
export const CONTACT_BADGE_STYLES = {
  customer: {
    label: "Customer",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgLight: "bg-green-100",
  },
  lead: {
    label: "Lead",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgLight: "bg-yellow-100",
  },
};

// Lead status colors
export const LEAD_STATUS_COLORS = {
  new: "bg-yellow-500",
  contacted: "bg-blue-500",
  qualified: "bg-purple-500",
  converted: "bg-green-500",
  lost: "bg-red-500",
};

// Message direction styles
export const MESSAGE_STYLES = {
  inbound: {
    align: "justify-start",
    bubbleColor: "bg-white border border-gray-200",
    textColor: "text-gray-800",
  },
  outbound: {
    align: "justify-end",
    bubbleColor: "bg-gradient-to-r from-indigo-500 to-purple-600",
    textColor: "text-white",
  },
};

// Animation classes
export const ANIMATIONS = {
  messageSlideIn: "animate-slideIn",
  conversationHover: "transition-all duration-200 hover:bg-gray-50",
  buttonHover: "transition-all duration-200 hover:shadow-lg",
  modalFadeIn: "animate-fadeIn",
};

// Layout constants
export const LAYOUT = {
  sidebarWidth: "w-full md:w-96 lg:w-[400px]",
  chatHeaderHeight: "h-20",
  messageComposerHeight: "h-24",
  avatarSize: {
    small: "w-8 h-8",
    medium: "w-12 h-12",
    large: "w-16 h-16",
  },
};

// Get platform color config
export const getPlatformColor = (platform) => {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.instagram;
};

// Get lead status color
export const getLeadStatusColor = (status) => {
  return LEAD_STATUS_COLORS[status] || LEAD_STATUS_COLORS.new;
};
