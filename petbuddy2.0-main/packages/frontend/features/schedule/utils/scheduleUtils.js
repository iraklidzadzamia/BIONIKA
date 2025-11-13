// Appointment display helpers for Schedule components
import { getCurrencySymbol } from "@/shared/utils";

export const getServiceName = (appointment) =>
  appointment?.serviceId?.name || "Service";

export const getVariantLabel = (appointment) => {
  const variant = appointment?.serviceItemId;
  if (!variant) return "";
  const parts = [];
  if (variant.size && variant.size !== "all") parts.push(variant.size);
  if (variant.coatType && variant.coatType !== "all")
    parts.push(variant.coatType);
  return parts.join(" • ");
};

export const getPrice = (appointment, currencyCode = "USD") =>
  typeof appointment?.serviceItemId?.price === "number"
    ? `${getCurrencySymbol(currencyCode)}${appointment.serviceItemId.price}`
    : null;

export const getCustomerName = (appointment) =>
  appointment?.customerId?.fullName || "Customer";

export const getPetInfo = (appointment) => {
  const pet = appointment?.petId;
  if (!pet) return null;
  const extra = [pet.breed, pet.species, pet.size].filter(Boolean).join(" • ");
  return extra ? `${pet.name} (${extra})` : pet.name;
};

export const getAppointmentSummary = (appointment) =>
  `${getServiceName(appointment)} • ${getCustomerName(appointment)}`;
