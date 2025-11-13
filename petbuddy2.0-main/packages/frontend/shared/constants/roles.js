// Centralized role definitions for frontend
// These should match the backend STAFF_ROLES from @petbuddy/shared

export const STAFF_ROLES = {
  MANAGER: 'manager',
  GROOMER: 'groomer',
  VETERINARIAN: 'veterinarian',
  VET_TECHNICIAN: 'vet_technician',
  TRAINER: 'trainer',
  RECEPTIONIST: 'receptionist',
};

export const STAFF_ROLE_VALUES = Object.values(STAFF_ROLES);

export const STAFF_ROLE_LABELS = {
  [STAFF_ROLES.MANAGER]: 'Manager',
  [STAFF_ROLES.GROOMER]: 'Groomer',
  [STAFF_ROLES.VETERINARIAN]: 'Veterinarian',
  [STAFF_ROLES.VET_TECHNICIAN]: 'Vet Technician',
  [STAFF_ROLES.TRAINER]: 'Trainer',
  [STAFF_ROLES.RECEPTIONIST]: 'Receptionist',
};

export const STAFF_ROLE_OPTIONS = STAFF_ROLE_VALUES.map((value) => ({
  value,
  label: STAFF_ROLE_LABELS[value],
}));

// Helper function to format role display name
export const formatRoleName = (role) => {
  return STAFF_ROLE_LABELS[role] || role.replace('_', ' ');
};
