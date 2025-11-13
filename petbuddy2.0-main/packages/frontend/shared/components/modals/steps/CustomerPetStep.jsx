"use client";
import React, { useMemo } from "react";
import {
  Input,
  Select,
  SearchableSelect,
  PhoneInput,
} from "@/shared/components/ui/inputs";
import { Loader } from "@/shared/components/ui";

const CustomerPetStep = ({
  errors,
  // Customer
  newCustomer,
  updateNewCustomer,
  phoneSearch,
  setPhoneSearch,
  showCustomerResults,
  setShowCustomerResults,
  filteredCustomers,
  isCustomerSearchFetching,
  handleCustomerSelect,
  selectedCustomer,
  // Pets
  pets,
  isPetsLoading,
  selectedPet,
  handleSelectExistingPet,
  showNewPetForm,
  setShowNewPetForm,
  newPet,
  updateNewPet,
  breedOptions,
  // Booking data
  bookingData,
  updateBookingData,
}) => {
  // Memoize expensive customer form sync check
  const isCustomerFormSynced = useMemo(() => {
    if (!selectedCustomer) return false;
    return (
      (newCustomer.fullName || "").trim() ===
        (selectedCustomer.fullName || "").trim() &&
      (newCustomer.phone || "").trim() ===
        (selectedCustomer.phone || "").trim() &&
      (newCustomer.email || "").trim() === (selectedCustomer.email || "").trim()
    );
  }, [
    selectedCustomer,
    newCustomer.fullName,
    newCustomer.phone,
    newCustomer.email,
  ]);

  return (
    <div className="space-y-4">
      {/* Customer and Pet Information - Side by Side on Desktop, Stacked on Mobile */}
      <div className="flex flex-col lg:flex-row gap-4 w-full min-h-0">
        {/* Customer Information - Left Side / Top on Mobile */}
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Customer Information
          </h4>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700">
                Find or add new customer
              </h5>
              {/* Phone Number Input with Search */}
              <div className="relative">
                <PhoneInput
                  label="Phone Number"
                  value={newCustomer.phone}
                  onValueChange={(e164) => {
                    updateNewCustomer("phone", e164);
                    const digits = String(e164 || "").replace(/\D/g, "");
                    setPhoneSearch(digits);
                  }}
                  error={errors.phone}
                  required
                  placeholder="Enter phone number to search or create new"
                  defaultCountry="GE"
                />

                {/* Customer Search Results Dropdown */}
                {showCustomerResults && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      {isCustomerSearchFetching && (
                        <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                          <Loader type="spinner" size="sm" variant="muted" />{" "}
                          Searching…
                        </div>
                      )}
                      {!isCustomerSearchFetching &&
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              handleCustomerSelect(customer);
                              setShowCustomerResults(false);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {customer.fullName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {customer.phone}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {customer.email || "No email"}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Full Name"
                value={newCustomer.fullName}
                onChange={(e) => updateNewCustomer("fullName", e.target.value)}
                error={errors.fullName}
                required
                placeholder="Enter full name"
              />

              <Input
                label="Email (Optional)"
                value={newCustomer.email}
                onChange={(e) => updateNewCustomer("email", e.target.value)}
                error={errors.email}
                placeholder="Enter email address"
                type="email"
              />
            </div>
          </div>
        </div>
        {/* Pet Details Section - Right Side / Bottom on Mobile */}
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Pet Details
          </h4>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="space-y-3">
              {/* Existing Pets Section - Only show when customer is selected and form is not expanded */}
              {selectedCustomer && !showNewPetForm && isCustomerFormSynced && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Existing Pets
                  </h5>
                  {isPetsLoading ? (
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Loader type="spinner" size="sm" variant="muted" />{" "}
                      Loading pets...
                    </div>
                  ) : pets.length > 0 ? (
                    <div className="space-y-2">
                      {pets.map((pet) => (
                        <button
                          key={pet._id}
                          type="button"
                          onClick={() => handleSelectExistingPet(pet)}
                          className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                            newPet.name.trim() === pet.name &&
                            newPet.breed === pet.breed &&
                            newPet.species === pet.species
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="font-medium">{pet.name}</div>
                          <div className="text-sm text-gray-600">
                            {pet.breed} • {pet.species}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                      No pets found for this customer
                    </div>
                  )}
                </div>
              )}

              {/* New Pet Input Fields - Show when no pets exist or when expanded */}
              {(!selectedCustomer ||
                pets.length === 0 ||
                showNewPetForm ||
                !isCustomerFormSynced) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-700">
                      Add New Pet
                    </h5>
                    {showNewPetForm && selectedCustomer && pets.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewPetForm(false);
                          // Clear form values when hiding
                          updateNewPet("name", "");
                          updateNewPet("species", "dog");
                          updateNewPet("breed", "");
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Hide Form
                      </button>
                    )}
                  </div>
                  {/* Removed helper text below per request */}
                  <Input
                    label="Pet Name"
                    value={newPet.name}
                    onChange={(e) => updateNewPet("name", e.target.value)}
                    error={errors.name}
                    required
                    placeholder="Enter pet name"
                  />
                  <Select
                    label="Species"
                    value={newPet.species}
                    onChange={(e) => updateNewPet("species", e.target.value)}
                    required
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="other">Other</option>
                  </Select>
                  <SearchableSelect
                    label="Breed"
                    value={newPet.breed}
                    onChange={(value) => updateNewPet("breed", value)}
                    options={breedOptions}
                    error={errors.breed}
                    required
                    placeholder="Search for breed..."
                  />
                </div>
              )}

              {/* Expand Pet Form Button - Only show when customer has pets and form is hidden */}
              {selectedCustomer &&
                pets.length > 0 &&
                !showNewPetForm &&
                isCustomerFormSynced && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateBookingData("petId", "");
                        setShowNewPetForm(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add New Pet
                    </button>
                  </div>
                )}

              {/* Selected Pet Display */}
              {selectedPet && isCustomerFormSynced && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-900">
                        Selected Pet: {selectedPet.name}
                      </div>
                      <div className="text-sm text-green-700">
                        {selectedPet.breed} • {selectedPet.species}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateBookingData("petId", "")}
                      className="text-sm text-green-600 hover:text-green-700"
                      title="Click to select a different pet or create a new one"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-red-800 text-sm">{errors.submit}</p>
        </div>
      )}
    </div>
  );
};

export default CustomerPetStep;
