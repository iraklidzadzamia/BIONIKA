// Shared constants (future use)
// Export shared constants here

// Appointment statuses
export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  NO_SHOW: 'no_show',
};

// Pet sizes
export const PET_SIZES = {
  SMALL: 'S',
  MEDIUM: 'M',
  LARGE: 'L',
  EXTRA_LARGE: 'XL',
};

// Contact statuses
export const CONTACT_STATUSES = {
  LEAD: 'lead',
  CUSTOMER: 'customer',
};

// Staff roles - used for both Staff and ServiceCategory allowedRoles
export const STAFF_ROLES = {
  MANAGER: 'manager',
  GROOMER: 'groomer',
  VETERINARIAN: 'veterinarian',
  VET_TECHNICIAN: 'vet_technician',
  TRAINER: 'trainer',
  RECEPTIONIST: 'receptionist',
};

// Array of staff role values for validation
export const STAFF_ROLE_VALUES = Object.values(STAFF_ROLES);

// Staff role display labels
export const STAFF_ROLE_LABELS = {
  [STAFF_ROLES.MANAGER]: 'Manager',
  [STAFF_ROLES.GROOMER]: 'Groomer',
  [STAFF_ROLES.VETERINARIAN]: 'Veterinarian',
  [STAFF_ROLES.VET_TECHNICIAN]: 'Vet Technician',
  [STAFF_ROLES.TRAINER]: 'Trainer',
  [STAFF_ROLES.RECEPTIONIST]: 'Receptionist',
};

// Staff role options for dropdowns/forms
export const STAFF_ROLE_OPTIONS = STAFF_ROLE_VALUES.map((value) => ({
  value,
  label: STAFF_ROLE_LABELS[value],
}));
