// Modern color system and styles for schedule components

// Service-based gradient backgrounds
export const SERVICE_GRADIENTS = {
  // Grooming services
  grooming: "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600",
  "full groom": "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600",
  "full grooming": "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600",

  // Bath services
  bath: "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",
  "bath & brush": "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",
  "bath and brush": "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",

  // Nail services
  nail: "bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600",
  "nail trim": "bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600",
  "nail trimming": "bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600",

  // Dental services
  teeth: "bg-gradient-to-br from-green-400 via-green-500 to-green-600",
  "teeth cleaning": "bg-gradient-to-br from-green-400 via-green-500 to-green-600",
  dental: "bg-gradient-to-br from-green-400 via-green-500 to-green-600",

  // Ear services
  ear: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600",
  "ear cleaning": "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600",

  // De-shedding
  "de-shedding": "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600",
  deshedding: "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600",
  shedding: "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600",

  // Flea treatment
  flea: "bg-gradient-to-br from-red-400 via-red-500 to-red-600",
  "flea treatment": "bg-gradient-to-br from-red-400 via-red-500 to-red-600",

  // Spa & special services
  spa: "bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600",
  massage: "bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600",

  // Default fallback
  default: "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600",
};

// Get gradient class for a service name
export const getServiceGradient = (serviceName) => {
  if (!serviceName) return SERVICE_GRADIENTS.default;

  const normalized = serviceName.toLowerCase().trim();

  // Try exact match first
  if (SERVICE_GRADIENTS[normalized]) {
    return SERVICE_GRADIENTS[normalized];
  }

  // Try partial match
  for (const [key, gradient] of Object.entries(SERVICE_GRADIENTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return gradient;
    }
  }

  return SERVICE_GRADIENTS.default;
};

// Service-based border colors (matches gradients)
export const SERVICE_BORDER_COLORS = {
  // Grooming services
  grooming: "border-purple-500",
  "full groom": "border-purple-500",
  "full grooming": "border-purple-500",
  // Bath services
  bath: "border-blue-500",
  "bath & brush": "border-blue-500",
  "bath and brush": "border-blue-500",
  // Nail services
  nail: "border-pink-500",
  "nail trim": "border-pink-500",
  "nail trimming": "border-pink-500",
  // Dental services
  teeth: "border-green-500",
  "teeth cleaning": "border-green-500",
  dental: "border-green-500",
  // Ear services
  ear: "border-yellow-500",
  "ear cleaning": "border-yellow-500",
  // De-shedding
  "de-shedding": "border-orange-500",
  deshedding: "border-orange-500",
  shedding: "border-orange-500",
  // Flea treatment
  flea: "border-red-500",
  "flea treatment": "border-red-500",
  // Spa & special services
  spa: "border-cyan-500",
  massage: "border-indigo-500",
  // Default fallback
  default: "border-gray-500",
};

// Get border color class for a service name
export const getServiceBorderColor = (serviceName) => {
  if (!serviceName) return SERVICE_BORDER_COLORS.default;

  const normalized = serviceName.toLowerCase().trim();

  // Try exact match first
  if (SERVICE_BORDER_COLORS[normalized]) {
    return SERVICE_BORDER_COLORS[normalized];
  }

  // Try partial match
  for (const [key, borderColor] of Object.entries(SERVICE_BORDER_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return borderColor;
    }
  }

  return SERVICE_BORDER_COLORS.default;
};

// Service-based bottom border background colors (matches border colors)
export const SERVICE_BG_COLORS = {
  // Grooming services
  grooming: "bg-purple-500",
  "full groom": "bg-purple-500",
  "full grooming": "bg-purple-500",
  // Bath services
  bath: "bg-blue-500",
  "bath & brush": "bg-blue-500",
  "bath and brush": "bg-blue-500",
  // Nail services
  nail: "bg-pink-500",
  "nail trim": "bg-pink-500",
  "nail trimming": "bg-pink-500",
  // Dental services
  teeth: "bg-green-500",
  "teeth cleaning": "bg-green-500",
  dental: "bg-green-500",
  // Ear services
  ear: "bg-yellow-500",
  "ear cleaning": "bg-yellow-500",
  // De-shedding
  "de-shedding": "bg-orange-500",
  deshedding: "bg-orange-500",
  shedding: "bg-orange-500",
  // Flea treatment
  flea: "bg-red-500",
  "flea treatment": "bg-red-500",
  // Spa & special services
  spa: "bg-cyan-500",
  massage: "bg-indigo-500",
  // Default fallback
  default: "bg-gray-500",
};

// Get background color class for bottom border
export const getServiceBgColor = (serviceName) => {
  if (!serviceName) return SERVICE_BG_COLORS.default;

  const normalized = serviceName.toLowerCase().trim();

  // Try exact match first
  if (SERVICE_BG_COLORS[normalized]) {
    return SERVICE_BG_COLORS[normalized];
  }

  // Try partial match
  for (const [key, bgColor] of Object.entries(SERVICE_BG_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return bgColor;
    }
  }

  return SERVICE_BG_COLORS.default;
};

// Status badge styles
export const STATUS_STYLES = {
  pending: {
    badge: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    icon: "⏳",
    label: "Pending",
  },
  confirmed: {
    badge: "bg-green-100 text-green-800 border border-green-300",
    icon: "✓",
    label: "Confirmed",
  },
  "checked-in": {
    badge: "bg-blue-100 text-blue-800 border border-blue-300",
    icon: "📍",
    label: "Checked In",
  },
  "in-progress": {
    badge: "bg-purple-100 text-purple-800 border border-purple-300",
    icon: "⚙️",
    label: "In Progress",
  },
  completed: {
    badge: "bg-gray-100 text-gray-800 border border-gray-300",
    icon: "✓",
    label: "Completed",
  },
  cancelled: {
    badge: "bg-red-100 text-red-800 border border-red-300",
    icon: "✕",
    label: "Cancelled",
  },
  "no-show": {
    badge: "bg-orange-100 text-orange-800 border border-orange-300",
    icon: "⚠",
    label: "No Show",
  },
};

// Get status badge style
export const getStatusStyle = (status) => {
  if (!status) return STATUS_STYLES.pending;

  const normalized = status.toLowerCase().replace(/\s+/g, "-");
  return STATUS_STYLES[normalized] || STATUS_STYLES.pending;
};

// Pet species emojis
export const PET_EMOJIS = {
  dog: "🐕",
  cat: "🐈",
  rabbit: "🐇",
  bird: "🐦",
  hamster: "🐹",
  guinea: "🐹",
  reptile: "🦎",
  fish: "🐠",
  default: "🐾",
};

// Get pet emoji based on species
export const getPetEmoji = (species) => {
  if (!species) return PET_EMOJIS.default;

  const normalized = species.toLowerCase().trim();

  for (const [key, emoji] of Object.entries(PET_EMOJIS)) {
    if (normalized.includes(key)) {
      return emoji;
    }
  }

  return PET_EMOJIS.default;
};

// Animation classes
export const ANIMATIONS = {
  cardHover: "transition-all duration-200 hover:scale-[1.02] hover:shadow-xl",
  cardClick: "active:scale-[0.98]",
  fadeIn: "animate-fadeIn",
  slideUp: "animate-slideUp",
  pulse: "animate-pulse",
};

// Card sizes
export const CARD_STYLES = {
  compact: {
    minHeight: "60px",
    padding: "p-2",
    fontSize: "text-xs",
  },
  normal: {
    minHeight: "80px",
    padding: "p-3",
    fontSize: "text-sm",
  },
  expanded: {
    minHeight: "120px",
    padding: "p-4",
    fontSize: "text-base",
  },
};
