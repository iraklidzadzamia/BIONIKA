"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/shared/components/ui";
import { format } from "date-fns";
import {
  useListStaffQuery,
  useCreateAppointmentMutation,
  useListPetsQuery,
  useCreateCustomerMutation,
  useCreatePetMutation,
  useSearchCustomersByPhoneQuery,
} from "@/core/api/appointmentsApi";
import { useListServicesQuery } from "@/core/api/appointmentsApi";
import { useGetServiceItemsQuery } from "@/core/api/serviceItemApi";
import { getBreedsBySpecies } from "@/shared/utils/breeds";
import { useListLocationsQuery } from "@/core/api/locationsApi";
import { useSelector, useDispatch } from "react-redux";
import { setSelectedLocation } from "@/core/store/slices/authSlice";
import StepIndicator from "./steps/StepIndicator";
import CustomerPetStep from "./steps/CustomerPetStep";
import ServiceStep from "./steps/ServiceStep";
import StaffTimeStep from "./steps/StaffTimeStep";
import ConfirmStep from "./steps/ConfirmStep";
import { getErrorsForStep } from "@/shared/utils/bookingValidation";
import { useGetGoogleSettingsQuery } from "@/core/api/settingsApi";
import {
  computeServiceItemDuration,
  DEFAULT_APPOINTMENT_DURATION,
} from "@/shared/utils/appointmentUtils";

const BookingWizard = ({
  onClose,
  initialDate,
  initialStaffId,
  initialLocationId,
  preset,
  customer,
  onBookingComplete,
}) => {
  const [step, setStep] = useState(1);

  // Handle preset (from clicking a time slot on schedule)
  const presetDate = preset?.start ? new Date(preset.start) : null;
  const presetStaffId = preset?.staffId || initialStaffId || "";

  const normalizedInitialDate = (() => {
    // Priority: preset > initialDate > empty
    const dateToUse = presetDate || initialDate;
    if (!dateToUse) return "";
    if (typeof dateToUse === "string") {
      // Accept already-normalized "yyyy-MM-dd" or ISO string
      try {
        // If it's longer than 10 chars, assume ISO and convert
        if (dateToUse.length > 10) {
          const d = new Date(dateToUse);
          return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
        }
        return dateToUse;
      } catch {
        return "";
      }
    }
    // Fallback: treat as Date
    try {
      return format(dateToUse, "yyyy-MM-dd");
    } catch {
      return "";
    }
  })();

  const normalizedInitialTime = (() => {
    if (!presetDate) return "";
    try {
      return format(presetDate, "HH:mm");
    } catch {
      return "";
    }
  })();

  const [bookingData, setBookingData] = useState({
    customerId: customer?._id || "",
    petId: "",
    serviceId: "",
    serviceItemId: "",
    staffId: presetStaffId,
    date: normalizedInitialDate,
    time: normalizedInitialTime,
    notes: "",
    locationId: initialLocationId || "",
  });
  const { data: googleSettings } = useGetGoogleSettingsQuery();
  const [googleSync, setGoogleSync] = useState(false);
  useEffect(() => {
    if (googleSettings?.settings) {
      setGoogleSync(!!googleSettings.settings.autoSync);
    }
  }, [googleSettings]);
  // Locations
  const dispatch = useDispatch();
  const { data: locationsRes } = useListLocationsQuery();
  const locations = locationsRes?.items || [];
  const selectedLocationId = useSelector((s) => s.auth.selectedLocationId);
  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      const main = locations.find((l) => l.isMain) || locations[0];
      if (main?._id) dispatch(setSelectedLocation(main._id));
    }
  }, [locations, selectedLocationId, dispatch]);
  useEffect(() => {
    // Only auto-set location if no initial location was provided
    if (
      !initialLocationId &&
      selectedLocationId &&
      bookingData.locationId !== selectedLocationId
    ) {
      setBookingData((prev) => ({ ...prev, locationId: selectedLocationId }));
    }
  }, [selectedLocationId, initialLocationId, bookingData.locationId]);

  // Customer search state
  const [phoneSearch, setPhoneSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  // New pet form state
  const [newPet, setNewPet] = useState({
    name: "",
    species: "dog",
    breed: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPetForm, setShowNewPetForm] = useState(false);

  // API queries - order matters for dependencies
  // Filter to only show service providers (staff who can perform services)
  const { data: staffData } = useListStaffQuery({
    serviceProvider: true,
  });
  const { data: petsData, isLoading: isPetsLoading } = useListPetsQuery(
    { customerId: bookingData.customerId },
    { skip: !bookingData.customerId }
  );

  // Extract data from API responses
  const pets = petsData?.items || [];
  const staff = staffData?.items || [];
  // Note: staff already filtered by serviceProvider: true, so all are service providers

  // Fetch services - filter by species if pet species is selected
  const { data: servicesData, isLoading: isServicesLoading } =
    useListServicesQuery(newPet.species ? { species: newPet.species } : {});

  // Fetch service items for the selected service category
  const { data: serviceItemsData, isLoading: isServiceItemsLoading } =
    useGetServiceItemsQuery(
      { serviceId: bookingData.serviceId },
      { skip: !bookingData.serviceId }
    );

  // Extract remaining data from API responses
  const services = servicesData?.items || [];
  const serviceItems = serviceItemsData?.items || [];

  // Mutations
  const [createAppointment] = useCreateAppointmentMutation();
  const [createCustomer] = useCreateCustomerMutation();
  const [createPet] = useCreatePetMutation();

  // Get breeds based on selected species
  const breedOptions = getBreedsBySpecies(newPet.species);

  // Remote search customers by phone or name
  const { data: customerSearchData, isFetching: isCustomerSearchFetching } =
    useSearchCustomersByPhoneQuery(phoneSearch.trim(), {
      skip: phoneSearch.trim().length < 3,
    });

  useEffect(() => {
    if (phoneSearch.trim().length >= 3) {
      const items = customerSearchData?.items || [];
      setFilteredCustomers(items);
      setShowCustomerResults(items.length > 0);
    } else {
      setShowCustomerResults(false);
      setFilteredCustomers([]);
    }
  }, [phoneSearch, customerSearchData]);

  // Handle customer selection from search results
  const handleCustomerSelect = (customer) => {
    setBookingData((prev) => ({
      ...prev,
      customerId: customer._id,
      petId: "",
    }));
    setPhoneSearch(String(customer.phone || "").replace(/\D/g, ""));
    setNewCustomer({
      fullName: customer.fullName || "",
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setShowCustomerResults(false);
    setShowNewPetForm(false);
  };

  // Removed old per-entity create handlers; creation happens in final step

  const validateStep = (currentStep) => {
    const newErrors = getErrorsForStep(currentStep, {
      newCustomer,
      newPet,
      bookingData,
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Removed old per-field validators; handled via central helper

  const nextStep = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (validateStep(step)) {
      setStep(step + 1);
      setErrors({});
    }
  };

  const prevStep = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    try {
      const selectedServiceItem = serviceItems.find(
        (v) => v._id === bookingData.serviceItemId
      );
      const selectedService = services.find(
        (s) => s._id === bookingData.serviceId
      );

      if (!selectedServiceItem || !selectedService) {
        throw new Error("Service or item not found");
      }

      const [hours, minutes] = bookingData.time.split(":");
      const startDate = new Date(bookingData.date);
      startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const effectiveMinutes =
        computeServiceItemDuration(selectedServiceItem) ||
        DEFAULT_APPOINTMENT_DURATION;
      const endDate = new Date(startDate.getTime() + effectiveMinutes * 60000);

      // Ensure customer exists (create if needed)
      let effectiveCustomerId = bookingData.customerId;
      if (!effectiveCustomerId) {
        const createdCustomer = await createCustomer({
          fullName: newCustomer.fullName.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email?.trim() || undefined,
        }).unwrap();
        effectiveCustomerId = createdCustomer.customer._id;
        updateBookingData("customerId", effectiveCustomerId);
      }

      // Ensure pet exists (create if needed)
      let effectivePetId = bookingData.petId;
      if (!effectivePetId) {
        const createdPet = await createPet({
          name: newPet.name.trim(),
          species: newPet.species,
          breed: newPet.breed,
          sex: "unknown",
          customerId: effectiveCustomerId,
        }).unwrap();
        effectivePetId = createdPet.pet._id;
        updateBookingData("petId", effectivePetId);
      }

      const appointmentData = {
        customerId: effectiveCustomerId,
        staffId: bookingData.staffId,
        petId: effectivePetId,
        serviceId: bookingData.serviceId,
        serviceItemId: bookingData.serviceItemId || undefined,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        notes: bookingData.notes || undefined,
        source: "phone",
        locationId: bookingData.locationId,
        googleSync: !!googleSync,
      };

      const result = await createAppointment(appointmentData).unwrap();

      if (onBookingComplete) {
        onBookingComplete(result.appointment);
      }
      onClose();
    } catch (error) {
      const message =
        error?.data?.error?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to create appointment";
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBookingData = (field, value) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const updateNewCustomer = (field, value) => {
    setNewCustomer((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const updateNewPet = (field, value) => {
    setNewPet((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const selectedService = services.find((s) => s._id === bookingData.serviceId);
  const selectedServiceItem = serviceItems.find(
    (v) => v._id === bookingData.serviceItemId
  );
  const selectedStaff = staff.find((s) => s._id === bookingData.staffId);
  const selectedPet = pets.find((p) => p._id === bookingData.petId);

  // Filter services by species from the pet form (new flow)
  const filteredServices = newPet?.species
    ? services.filter((s) => s.species === newPet.species)
    : services;

  // When user clicks an existing pet, fill the pet form fields and set petId to use existing
  const handleSelectExistingPet = (pet) => {
    setNewPet({
      name: pet.name || "",
      species: pet.species || "dog",
      breed: pet.breed || "",
    });
    updateBookingData("petId", pet._id);
    setShowNewPetForm(false);
  };

  // Compute selected customer for display purposes
  const selectedCustomer = useMemo(() => {
    if (!bookingData.customerId) return null;
    return (
      filteredCustomers.find((c) => c._id === bookingData.customerId) || null
    );
  }, [bookingData.customerId, filteredCustomers]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Step Indicator */}
      <div className="flex-shrink-0 pt-2 pb-4">
        <StepIndicator
          step={step}
          setStep={setStep}
          newCustomer={newCustomer}
          newPet={newPet}
          bookingData={bookingData}
        />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Step 1: Customer & Pet */}
        {step === 1 && (
          <CustomerPetStep
            errors={errors}
            newCustomer={newCustomer}
            updateNewCustomer={updateNewCustomer}
            phoneSearch={phoneSearch}
            setPhoneSearch={setPhoneSearch}
            showCustomerResults={showCustomerResults}
            setShowCustomerResults={setShowCustomerResults}
            filteredCustomers={filteredCustomers}
            isCustomerSearchFetching={isCustomerSearchFetching}
            handleCustomerSelect={handleCustomerSelect}
            selectedCustomer={selectedCustomer}
            pets={pets}
            isPetsLoading={isPetsLoading}
            selectedPet={selectedPet}
            handleSelectExistingPet={handleSelectExistingPet}
            showNewPetForm={showNewPetForm}
            setShowNewPetForm={setShowNewPetForm}
            newPet={newPet}
            updateNewPet={updateNewPet}
            breedOptions={breedOptions}
            bookingData={bookingData}
            updateBookingData={updateBookingData}
          />
        )}

        {/* Step 2: Service & Variant Selection */}
        {step === 2 && (
          <ServiceStep
            errors={errors}
            bookingData={bookingData}
            updateBookingData={updateBookingData}
            isServicesLoading={isServicesLoading}
            filteredServices={filteredServices}
            isServiceItemsLoading={isServiceItemsLoading}
            serviceItems={serviceItems}
            computeVariantDuration={computeServiceItemDuration}
            selectedService={selectedService}
            selectedServiceItem={selectedServiceItem}
            newPet={newPet}
          />
        )}

        {/* Step 3: Staff & Time Selection */}
        {step === 3 && (
          <>
            {staff.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                <div className="text-yellow-800 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">
                    No Staff Members Available
                  </h3>
                  <p className="text-sm mb-4">
                    You need to add service provider staff members (groomers, veterinarians, etc.)
                    before you can schedule appointments.
                  </p>
                  <p className="text-sm text-yellow-700">
                    Please close this dialog and add staff members from the Staff settings page first.
                  </p>
                </div>
              </div>
            ) : (
              <StaffTimeStep
                errors={errors}
                bookingData={bookingData}
                updateBookingData={updateBookingData}
                groomers={staff}
                selectedService={selectedService}
                selectedServiceItem={selectedServiceItem}
                computeVariantDuration={computeServiceItemDuration}
              />
            )}
          </>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <ConfirmStep
            errors={errors}
            bookingData={bookingData}
            selectedCustomer={selectedCustomer}
            selectedPet={selectedPet}
            newCustomer={newCustomer}
            newPet={newPet}
            selectedService={selectedService}
            selectedServiceItem={selectedServiceItem}
            selectedStaff={selectedStaff}
            computeVariantDuration={computeServiceItemDuration}
            setStep={setStep}
            updateBookingData={updateBookingData}
            showGoogleToggle={true}
            googleSyncEnabled={googleSync}
            onToggleGoogleSync={() => setGoogleSync((v) => !v)}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex-shrink-0 flex items-center justify-between py-4 border-t border-gray-200 bg-gray-50/50">
        <div>
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={prevStep}>
              ← Back
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          {step < 4 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={
                (step === 1 &&
                  (!newCustomer.fullName.trim() ||
                    !newCustomer.phone.trim() ||
                    !newPet.name.trim() ||
                    !newPet.breed)) ||
                (step === 2 &&
                  (!bookingData.serviceId || !bookingData.serviceItemId)) ||
                (step === 3 &&
                  (staff.length === 0 ||
                    !bookingData.staffId ||
                    !bookingData.date ||
                    !bookingData.time))
              }
            >
              Next →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Appointment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingWizard;
