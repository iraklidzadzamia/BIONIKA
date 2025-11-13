"use client";
import { useState, useEffect } from "react";
import { Input, EmailInput, PhoneInput, Select, Button } from "@/shared/components/ui";
import { useCompanySettings } from "../hooks";
import { SettingsSection } from "@/components/settings";
import { BuildingOfficeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { getCurrencySymbol } from "@/shared/utils";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
  "Asia/Tbilisi",
];

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "GEL", name: "Georgian Lari" },
];

/**
 * Company information settings section
 */
export default function CompanyInfoSection() {
  const { company, companyId, isLoading, updateCompanyProfile, refetch } =
    useCompanySettings();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    website: "",
    timezone: "UTC",
    mainCurrency: "USD",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Update form when company data loads
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        timezone: company.timezone || "UTC",
        mainCurrency: company.mainCurrency || "USD",
      });
    }
  }, [company]);

  const handleSave = async () => {
    try {
      if (!companyId) {
        return;
      }

      setIsSaving(true);
      setSaveSuccess(false);
      setError(null);

      // Structure the data properly for the API
      const companyData = {
        ...formData,
        settings: {
          ...company.settings, // Preserve existing settings like workHours
        },
      };

      await updateCompanyProfile({
        companyId,
        companyData,
      }).unwrap();

      // Refetch to ensure consistency
      await refetch();

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save company info:", err);
      const errorMessage = err?.data?.message || err?.message || "Failed to save company information";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (error) setError(null);
  };

  if (isLoading) {
    return (
      <SettingsSection
        title="Company Information"
        description="Manage your company details"
        icon={BuildingOfficeIcon}
      >
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Company Information"
      description="Manage your company details and preferences"
      icon={BuildingOfficeIcon}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Company Name"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter company name"
          required
        />

        <EmailInput
          label="Email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="company@example.com"
          required
        />

        <PhoneInput
          label="Phone"
          value={formData.phone}
          onValueChange={(e164) => updateField("phone", e164)}
          placeholder="+995 555 123 456"
          defaultCountry="GE"
        />

        <Input
          label="Website"
          value={formData.website}
          onChange={(e) => updateField("website", e.target.value)}
          placeholder="https://example.com"
        />

        <Select
          label="Timezone"
          value={formData.timezone}
          onChange={(e) => updateField("timezone", e.target.value)}
          options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
          required
        />

        <Select
          label="Currency"
          value={formData.mainCurrency}
          onChange={(e) => updateField("mainCurrency", e.target.value)}
          options={CURRENCIES.map((curr) => ({
            value: curr.code,
            label: `${curr.code} (${getCurrencySymbol(curr.code)}) - ${curr.name}`,
          }))}
          required
        />
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <div className="min-h-[40px] flex items-center">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </div>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={
            saveSuccess
              ? "bg-green-600 hover:bg-green-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }
        >
          {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </SettingsSection>
  );
}
