import { z } from "zod";

// Common validation patterns
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number");
const phoneSchema = z
  .string()
  .refine((val) => !val || /^\+?[1-9]\d{9,14}$/.test(val), {
    message: "Invalid phone number",
  })
  .optional();
const urlSchema = z
  .string()
  .refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Invalid URL",
  })
  .optional();

// User/Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  color: z
    .string()
    .refine((val) => !val || /^#[0-9A-Fa-f]{6}$/.test(val), {
      message: "Invalid color format",
    })
    .optional(),
});

// Company schemas
export const registerCompanySchema = z.object({
  company: z.object({
    name: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .max(100, "Company name must be less than 100 characters"),
    email: emailSchema,
    timezone: z.string().min(3, "Timezone is required"),
    businessTypes: z
      .array(z.string())
      .min(1, "Select at least one business type"),
    locations: z
      .array(
        z.object({
          label: z.string().min(1, "Location label is required"),
          address: z.string().min(5, "Address must be at least 5 characters"),
          googleLocationUrl: urlSchema,
          phone: phoneSchema,
          timezone: z.string().optional(),
          isMain: z.boolean().optional(),
        })
      )
      .min(1, "Add at least one location"),
  }),
  user: registerUserSchema.extend({
    tosAccepted: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must accept the Terms of Service and Privacy Policy"
      ),
  }),
});

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  website: urlSchema,
  timezone: z.string().optional(),
  businessTypes: z.array(z.string()).optional(),
});

// Location schemas
export const locationSchema = z.object({
  label: z.string().min(1, "Location label is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  googleLocationUrl: urlSchema,
  phone: phoneSchema,
  timezone: z.string().optional(),
  isMain: z.boolean().optional(),
});

// Staff schemas
export const staffSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(["manager", "groomer", "receptionist"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  locationIds: z.array(z.string()).min(1, "Select at least one location"),
  serviceIds: z.array(z.string()).optional(),
  password: passwordSchema.optional(),
});

// Service schemas
export const serviceSchema = z.object({
  name: z
    .string()
    .min(2, "Service name must be at least 2 characters")
    .max(100),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  price: z.number().min(0, "Price must be a positive number"),
  isActive: z.boolean().optional(),
});

// Appointment schemas
export const appointmentSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    petId: z.string().min(1, "Pet is required"),
    staffId: z.string().min(1, "Staff member is required"),
    serviceId: z.string().min(1, "Service is required"),
    serviceItemId: z.string().optional(),
    locationId: z.string().min(1, "Location is required"),
    start: z.string().datetime("Invalid start date"),
    end: z.string().datetime("Invalid end date"),
    notes: z.string().optional(),
    googleSync: z.boolean().optional(),
  })
  .refine((data) => new Date(data.end) > new Date(data.start), {
    message: "End time must be after start time",
    path: ["end"],
  });

// Customer schemas
export const customerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema.optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Pet schemas
export const petSchema = z.object({
  name: z.string().min(1, "Pet name is required").max(50),
  species: z.string().min(1, "Species is required"),
  breed: z.string().optional(),
  age: z.number().min(0, "Age must be a positive number").optional(),
  weight: z.number().min(0, "Weight must be a positive number").optional(),
  notes: z.string().optional(),
});

// Helper function to get user-friendly error messages
export function getErrorMessage(error) {
  const errorList = error.issues || error.errors || [];
  if (errorList.length > 0) {
    return errorList[0].message;
  }
  return "Validation failed";
}

// Helper function to get all error messages as an object
export function getFieldErrors(error) {
  const errors = {};
  const errorList = error.issues || error.errors || [];

  errorList.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });

  return errors;
}
