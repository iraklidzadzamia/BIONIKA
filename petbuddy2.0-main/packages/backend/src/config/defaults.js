import { AI_PROMPTS_BY_BUSINESS_TYPE } from './aiPromptsByBusinessType.js';

// Default company settings
export const DEFAULT_COMPANY_SETTINGS = {
  timezone: 'UTC',
  mainCurrency: 'USD',
  status: 'active',
  settings: {
    // Default working hours (Monday-Sunday)
    workHours: [
      { weekday: 1, startTime: '09:00', endTime: '18:00' }, // Monday
      { weekday: 2, startTime: '09:00', endTime: '18:00' }, // Tuesday
      { weekday: 3, startTime: '09:00', endTime: '18:00' }, // Wednesday
      { weekday: 4, startTime: '09:00', endTime: '18:00' }, // Thursday
      { weekday: 5, startTime: '09:00', endTime: '18:00' }, // Friday
      { weekday: 6, startTime: '09:00', endTime: '17:00' }, // Saturday
      { weekday: 0, startTime: '10:00', endTime: '16:00' }, // Sunday
    ],
    // Default holidays (common holidays)
    holidays: [
      new Date(new Date().getFullYear(), 0, 1), // New Year's Day
      new Date(new Date().getFullYear(), 11, 25), // Christmas
      new Date(new Date().getFullYear(), 6, 4), // Independence Day (US)
      new Date(new Date().getFullYear(), 10, 11), // Veterans Day
    ],
  },

  // Default bot configuration (uses grooming as default)
  bot: {
    systemInstruction: AI_PROMPTS_BY_BUSINESS_TYPE.grooming.systemInstruction,
    conversationExamples: AI_PROMPTS_BY_BUSINESS_TYPE.grooming.conversationExamples,
    services: ['Full Groom', 'Basic Groom', 'Bath & Brush', 'Nail Trim', 'Cat Groom'],
    active: true,
    activeHours: {
      intervalActive: false,
      startTime: '08:00',
      endTime: '20:00',
      timezone: 'UTC',
    },
  },

  // Default payment methods
  paymentMethods: [
    {
      bankName: 'Sample Bank',
      accountNumber: '1234567890',
      accountName: 'Your Company Name',
      sortCode: '12-34-56',
    },
  ],

  // Default logo and branding
  logo: 'https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=PetBuddy',
  ringLogo: 'https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=PetBuddy',

  // Default integration settings (legacy minimized; tokens live in CompanyIntegration)
  integration: {
    fbPageId: '',
    instagramPageId: '',
  },
};

// Default services for different pet types (categories only)
export const DEFAULT_SERVICES = [
  // Minimal, common service categories
  {
    name: 'Full Groom',
    description:
      'Complete grooming package including bath, haircut, nail trim, ear cleaning, and brush out',
    species: 'dog',
    requiresBath: true,
  },
  {
    name: 'Basic Groom',
    description: 'Basic grooming including bath, trim, and nail trim',
    species: 'dog',
    requiresBath: true,
  },
  {
    name: 'Bath & Brush',
    description: 'Bath, brush out, and nail trim',
    species: 'dog',
    requiresBath: true,
  },
  {
    name: 'Nail Trim',
    description: 'Nail trimming and filing',
    species: 'dog',
    requiresBath: false,
  },
  {
    name: 'Cat Groom',
    description: 'Complete cat grooming including bath, trim, and nail trim',
    species: 'cat',
    requiresBath: true,
  },
  {
    name: 'Cat Nail Trim',
    description: 'Cat nail trimming',
    species: 'cat',
    requiresBath: false,
  },
];

// Default resource types for pet grooming salons
export const DEFAULT_RESOURCE_TYPES = [
  {
    name: 'Grooming Tub',
    description: 'Standard grooming tub for bathing pets',
    category: 'equipment',
    color: '#3B82F6',
    icon: 'droplet',
    active: true,
  },
  {
    name: 'Grooming Table',
    description: 'Grooming table for trimming and styling',
    category: 'equipment',
    color: '#10B981',
    icon: 'table',
    active: true,
  },
];

// Default resources for pet grooming salons
export const DEFAULT_RESOURCES = [
  {
    resourceTypeName: 'Grooming Tub', // Will be resolved to resourceTypeId
    label: 'Grooming Tub 1',
    species: ['all'],
    active: true,
  },
  {
    resourceTypeName: 'Grooming Table',
    label: 'Grooming Table 1',
    species: ['all'],
    active: true,
  },
  {
    resourceTypeName: 'Grooming Table',
    label: 'Grooming Table 2',
    species: ['all'],
    active: true,
  },
];

// Default service items for different sizes and coat types
export const DEFAULT_SERVICE_ITEMS = [
  // Minimal, common variants
  {
    size: 'S',
    label: 'Small Dog',
    coatType: 'all',
    durationMinutes: 45,
    price: 45,
    active: true,
    requiredResources: [
      { resourceTypeName: 'Grooming Tub', durationMinutes: 20 },
      { resourceTypeName: 'Grooming Table', durationMinutes: 25 },
    ],
  },
  {
    size: 'M',
    label: 'Medium Dog',
    coatType: 'all',
    durationMinutes: 60,
    price: 65,
    active: true,
    requiredResources: [
      { resourceTypeName: 'Grooming Tub', durationMinutes: 25 },
      { resourceTypeName: 'Grooming Table', durationMinutes: 35 },
    ],
  },
  {
    size: 'L',
    label: 'Large Dog',
    coatType: 'all',
    durationMinutes: 75,
    price: 85,
    active: true,
    requiredResources: [
      { resourceTypeName: 'Grooming Tub', durationMinutes: 30 },
      { resourceTypeName: 'Grooming Table', durationMinutes: 45 },
    ],
  },
  {
    size: 'XL',
    label: 'Extra Large Dog',
    coatType: 'all',
    durationMinutes: 90,
    price: 105,
    active: true,
    requiredResources: [
      { resourceTypeName: 'Grooming Tub', durationMinutes: 35 },
      { resourceTypeName: 'Grooming Table', durationMinutes: 55 },
    ],
  },
  {
    size: 'all',
    label: 'Cat',
    coatType: 'all',
    durationMinutes: 60,
    price: 55,
    active: true,
    requiredResources: [{ resourceTypeName: 'Grooming Table', durationMinutes: 30 }],
  },
];

// Default user profile picture
export const DEFAULT_USER_PICTURE = 'https://via.placeholder.com/150x150/6B7280/FFFFFF?text=User';

// Default company logo
export const DEFAULT_COMPANY_LOGO =
  'https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=PetBuddy';

// Default welcome message for new companies
export const DEFAULT_WELCOME_MESSAGE = `Welcome to PetBuddy! 🐾

Your pet grooming salon management system is now set up with:

✅ **Default Services**: Complete pricing for dogs (all sizes) and cats
✅ **Default Resources**: 1 grooming tub and 2 grooming tables
✅ **Service Variants**: Size-based options (dogs S/M/L, cats all)
✅ **Working Hours**: Standard 9 AM - 6 PM schedule (customizable)
✅ **Bot Assistant**: AI-powered customer service bot
✅ **Payment Setup**: Basic payment method configuration

**Quick Start Guide:**
1. Customize your services and pricing
2. Configure your grooming resources and equipment
3. Set your actual working hours
4. Add your staff members
5. Configure your payment methods
6. Customize your bot responses
7. Upload your company logo

Need help? Check out our documentation or contact support!`;

// Default company description
export const DEFAULT_COMPANY_DESCRIPTION = `Professional pet grooming services with a focus on quality care and customer satisfaction. We offer comprehensive grooming packages for dogs and cats of all sizes.`;

// Default business policies
export const DEFAULT_BUSINESS_POLICIES = {
  cancellationPolicy: '24-hour notice required for appointment cancellations',
  latePolicy: 'Appointments may be rescheduled if more than 15 minutes late',
  paymentPolicy: 'Payment due at time of service',
  healthPolicy: 'Pets must be healthy and up-to-date on vaccinations',
};

// Export AI prompts function for use in other modules
export { getAIPromptForBusinessType } from './aiPromptsByBusinessType.js';
