// Business-type specific default data for company setup

export const businessTypeSeeds = {
  grooming: {
    resourceTypes: [
      { name: 'Grooming Tub', description: 'Professional pet bathing station' },
      { name: 'Grooming Table', description: 'Elevated grooming work surface' },
      { name: 'Drying Station', description: 'Pet drying area with dryers' },
    ],
    resources: [
      { name: 'Grooming Tub 1', typeIndex: 0 },
      { name: 'Grooming Table 1', typeIndex: 1 },
      { name: 'Grooming Table 2', typeIndex: 1 },
      { name: 'Drying Station 1', typeIndex: 2 },
    ],
    serviceCategories: [
      {
        name: 'Full Groom',
        description: 'Complete grooming service including bath, haircut, nails, and ears',
        petType: 'dog',
        allowedRoles: ['groomer'],
        variants: [
          { size: 'S', duration: 90, basePrice: 50 },
          { size: 'M', duration: 120, basePrice: 65 },
          { size: 'L', duration: 150, basePrice: 85 },
          { size: 'XL', duration: 180, basePrice: 105 },
        ],
      },
      {
        name: 'Basic Groom',
        description: 'Basic grooming including bath, trim, and nail trim',
        petType: 'dog',
        allowedRoles: ['groomer'],
        variants: [
          { size: 'S', duration: 60, basePrice: 35 },
          { size: 'M', duration: 90, basePrice: 50 },
          { size: 'L', duration: 120, basePrice: 65 },
          { size: 'XL', duration: 150, basePrice: 85 },
        ],
      },
      {
        name: 'Bath & Brush',
        description: 'Bath, dry, and brush out',
        petType: 'dog',
        allowedRoles: ['groomer'],
        variants: [
          { size: 'S', duration: 45, basePrice: 30 },
          { size: 'M', duration: 60, basePrice: 40 },
          { size: 'L', duration: 75, basePrice: 55 },
          { size: 'XL', duration: 90, basePrice: 70 },
        ],
      },
      {
        name: 'Nail Trim',
        description: 'Nail trimming and filing',
        petType: 'dog',
        allowedRoles: ['groomer'],
        variants: [{ size: 'all', duration: 15, basePrice: 15 }],
      },
      {
        name: 'Cat Groom',
        description: 'Complete cat grooming service',
        petType: 'cat',
        allowedRoles: ['groomer'],
        variants: [{ size: 'all', duration: 60, basePrice: 55 }],
      },
      {
        name: 'Cat Nail Trim',
        description: 'Cat nail trimming',
        petType: 'cat',
        allowedRoles: ['groomer'],
        variants: [{ size: 'all', duration: 20, basePrice: 15 }],
      },
    ],
  },

  vet: {
    resourceTypes: [
      { name: 'Examination Room', description: 'Veterinary examination room' },
      { name: 'Surgery Suite', description: 'Surgical procedure room' },
      { name: 'X-Ray Room', description: 'Diagnostic imaging room' },
    ],
    resources: [
      { name: 'Exam Room 1', typeIndex: 0 },
      { name: 'Exam Room 2', typeIndex: 0 },
      { name: 'Surgery Suite', typeIndex: 1 },
      { name: 'X-Ray Room', typeIndex: 2 },
    ],
    serviceCategories: [
      {
        name: 'Wellness Exam',
        description: 'Annual health checkup',
        petType: 'dog',
        allowedRoles: ['veterinarian', 'vet_technician'],
        variants: [{ size: 'all', duration: 30, basePrice: 65 }],
      },
      {
        name: 'Vaccination',
        description: 'Routine vaccinations',
        petType: 'dog',
        allowedRoles: ['veterinarian', 'vet_technician'],
        variants: [{ size: 'all', duration: 20, basePrice: 35 }],
      },
      {
        name: 'Dental Cleaning',
        description: 'Professional dental cleaning',
        petType: 'dog',
        allowedRoles: ['veterinarian'],
        variants: [{ size: 'all', duration: 90, basePrice: 250 }],
      },
      {
        name: 'Cat Wellness Exam',
        description: 'Annual feline checkup',
        petType: 'cat',
        allowedRoles: ['veterinarian', 'vet_technician'],
        variants: [{ size: 'all', duration: 30, basePrice: 60 }],
      },
      {
        name: 'Emergency Visit',
        description: 'Urgent care consultation',
        petType: 'dog',
        allowedRoles: ['veterinarian'],
        variants: [{ size: 'all', duration: 45, basePrice: 150 }],
      },
    ],
  },

  boarding: {
    resourceTypes: [
      { name: 'Standard Kennel', description: 'Indoor climate-controlled kennel' },
      { name: 'Luxury Suite', description: 'Premium boarding accommodation' },
      { name: 'Cat Condo', description: 'Feline boarding room' },
    ],
    resources: [
      { name: 'Kennel 1', typeIndex: 0 },
      { name: 'Kennel 2', typeIndex: 0 },
      { name: 'Kennel 3', typeIndex: 0 },
      { name: 'Luxury Suite 1', typeIndex: 1 },
      { name: 'Cat Condo 1', typeIndex: 2 },
      { name: 'Cat Condo 2', typeIndex: 2 },
    ],
    serviceCategories: [
      {
        name: 'Standard Boarding',
        description: 'Overnight pet boarding with daily care',
        petType: 'dog',
        allowedRoles: ['receptionist'],
        variants: [
          { size: 'S', duration: 1440, basePrice: 35 }, // per day in minutes
          { size: 'M', duration: 1440, basePrice: 40 },
          { size: 'L', duration: 1440, basePrice: 50 },
          { size: 'XL', duration: 1440, basePrice: 60 },
        ],
      },
      {
        name: 'Luxury Boarding',
        description: 'Premium overnight care with extras',
        petType: 'dog',
        allowedRoles: ['receptionist'],
        variants: [
          { size: 'S', duration: 1440, basePrice: 65 },
          { size: 'M', duration: 1440, basePrice: 75 },
          { size: 'L', duration: 1440, basePrice: 85 },
        ],
      },
      {
        name: 'Cat Boarding',
        description: 'Overnight feline care',
        petType: 'cat',
        allowedRoles: ['receptionist'],
        variants: [{ size: 'all', duration: 1440, basePrice: 30 }],
      },
    ],
  },

  daycare: {
    resourceTypes: [
      { name: 'Play Area', description: 'Indoor/outdoor play space' },
      { name: 'Rest Area', description: 'Quiet resting space' },
      { name: 'Small Dog Area', description: 'Dedicated small dog zone' },
    ],
    resources: [
      { name: 'Main Play Area', typeIndex: 0 },
      { name: 'Small Dog Zone', typeIndex: 2 },
      { name: 'Rest Area 1', typeIndex: 1 },
    ],
    serviceCategories: [
      {
        name: 'Full Day Daycare',
        description: 'All-day supervised play and care',
        petType: 'dog',
        allowedRoles: ['receptionist'],
        variants: [
          { size: 'S', duration: 480, basePrice: 30 }, // 8 hours
          { size: 'M', duration: 480, basePrice: 35 },
          { size: 'L', duration: 480, basePrice: 40 },
        ],
      },
      {
        name: 'Half Day Daycare',
        description: '4-hour supervised play',
        petType: 'dog',
        allowedRoles: ['receptionist'],
        variants: [
          { size: 'S', duration: 240, basePrice: 20 },
          { size: 'M', duration: 240, basePrice: 25 },
          { size: 'L', duration: 240, basePrice: 30 },
        ],
      },
      {
        name: 'Puppy Socialization',
        description: 'Supervised puppy play and training',
        petType: 'dog',
        allowedRoles: ['trainer'],
        variants: [{ size: 'S', duration: 120, basePrice: 25 }],
      },
    ],
  },

  training: {
    resourceTypes: [
      { name: 'Training Room', description: 'Indoor training space' },
      { name: 'Agility Course', description: 'Outdoor agility equipment area' },
      { name: 'Private Training Area', description: 'One-on-one training space' },
    ],
    resources: [
      { name: 'Training Room 1', typeIndex: 0 },
      { name: 'Agility Course', typeIndex: 1 },
      { name: 'Private Area', typeIndex: 2 },
    ],
    serviceCategories: [
      {
        name: 'Basic Obedience',
        description: 'Fundamental commands and behavior',
        petType: 'dog',
        allowedRoles: ['trainer'],
        variants: [{ size: 'all', duration: 60, basePrice: 75 }],
      },
      {
        name: 'Advanced Training',
        description: 'Advanced commands and off-leash work',
        petType: 'dog',
        allowedRoles: ['trainer'],
        variants: [{ size: 'all', duration: 60, basePrice: 95 }],
      },
      {
        name: 'Puppy Training',
        description: 'Early socialization and basic commands',
        petType: 'dog',
        allowedRoles: ['trainer'],
        variants: [{ size: 'S', duration: 45, basePrice: 65 }],
      },
      {
        name: 'Behavior Modification',
        description: 'Address specific behavioral issues',
        petType: 'dog',
        allowedRoles: ['trainer'],
        variants: [{ size: 'all', duration: 90, basePrice: 125 }],
      },
      {
        name: 'Agility Training',
        description: 'Obstacle course and agility skills',
        petType: 'dog',
        allowedRoles: ['trainer'],
        variants: [{ size: 'all', duration: 60, basePrice: 85 }],
      },
    ],
  },

  other: {
    resourceTypes: [
      { name: 'Service Area 1', description: 'General service area' },
      { name: 'Service Area 2', description: 'Additional service space' },
    ],
    resources: [
      { name: 'Area 1', typeIndex: 0 },
      { name: 'Area 2', typeIndex: 1 },
    ],
    serviceCategories: [
      {
        name: 'Basic Service',
        description: 'Standard pet care service',
        petType: 'dog',
        allowedRoles: ['receptionist'],
        variants: [
          { size: 'S', duration: 30, basePrice: 25 },
          { size: 'M', duration: 45, basePrice: 35 },
          { size: 'L', duration: 60, basePrice: 45 },
        ],
      },
      {
        name: 'Premium Service',
        description: 'Enhanced pet care service',
        petType: 'dog',
        allowedRoles: ['receptionist'],
        variants: [
          { size: 'S', duration: 60, basePrice: 50 },
          { size: 'M', duration: 75, basePrice: 65 },
        ],
      },
    ],
  },
};

/**
 * Get combined seed data for multiple business types
 * @param {string[]} businessTypes - Array of business type strings
 * @returns {object} Combined seed data
 */
export function getCombinedSeeds(businessTypes) {
  if (!businessTypes || !Array.isArray(businessTypes) || businessTypes.length === 0) {
    // Default to grooming if no types specified
    return businessTypeSeeds.grooming;
  }

  // If only one type, return it directly
  if (businessTypes.length === 1) {
    return businessTypeSeeds[businessTypes[0]] || businessTypeSeeds.grooming;
  }

  // Combine multiple business types
  const combined = {
    resourceTypes: [],
    resources: [],
    serviceCategories: [],
  };

  const resourceTypeMap = new Map(); // Track unique resource types
  let resourceTypeIndex = 0;

  businessTypes.forEach(type => {
    const seed = businessTypeSeeds[type];
    if (!seed) return;

    // Add resource types (avoid duplicates)
    seed.resourceTypes.forEach(rt => {
      const key = rt.name.toLowerCase();
      if (!resourceTypeMap.has(key)) {
        resourceTypeMap.set(key, resourceTypeIndex);
        combined.resourceTypes.push(rt);
        resourceTypeIndex++;
      }
    });

    // Add resources with adjusted type indices
    seed.resources.forEach(r => {
      const originalTypeName = seed.resourceTypes[r.typeIndex].name.toLowerCase();
      const newTypeIndex = resourceTypeMap.get(originalTypeName);
      combined.resources.push({
        ...r,
        typeIndex: newTypeIndex,
      });
    });

    // Add all service categories
    combined.serviceCategories.push(...seed.serviceCategories);
  });

  return combined;
}
