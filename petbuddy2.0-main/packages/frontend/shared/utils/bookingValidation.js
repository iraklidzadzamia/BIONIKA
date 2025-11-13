export const getStep1Errors = (newCustomer, newPet) => {
  const errors = {};
  if (!newCustomer?.fullName?.trim())
    errors.fullName = "Please enter customer name";
  if (!newCustomer?.phone?.trim()) errors.phone = "Please enter customer phone";
  if (!newPet?.name?.trim()) errors.name = "Please enter pet name";
  if (!newPet?.breed) errors.breed = "Please select pet breed";
  return errors;
};

export const getStep2Errors = (bookingData) => {
  const errors = {};
  if (!bookingData?.serviceId) errors.serviceId = "Please select a service";
  if (!bookingData?.serviceItemId)
    errors.serviceItemId = "Please select a service item";
  return errors;
};

export const getStep3Errors = (bookingData) => {
  const errors = {};
  if (!bookingData?.staffId) errors.staffId = "Please select staff";
  if (!bookingData?.date) errors.date = "Please select a date";
  if (!bookingData?.time) errors.time = "Please select a time";
  return errors;
};

export const isStep1Complete = (newCustomer, newPet) =>
  Object.keys(getStep1Errors(newCustomer, newPet)).length === 0;

export const isStep2Complete = (bookingData, newCustomer, newPet) =>
  isStep1Complete(newCustomer, newPet) &&
  Object.keys(getStep2Errors(bookingData)).length === 0;

export const isStep3Complete = (bookingData, newCustomer, newPet) =>
  isStep2Complete(bookingData, newCustomer, newPet) &&
  Object.keys(getStep3Errors(bookingData)).length === 0;

export const getErrorsForStep = (
  step,
  { newCustomer, newPet, bookingData }
) => {
  if (step === 1) return getStep1Errors(newCustomer, newPet);
  if (step === 2) return getStep2Errors(bookingData);
  if (step === 3) return getStep3Errors(bookingData);
  return {};
};
