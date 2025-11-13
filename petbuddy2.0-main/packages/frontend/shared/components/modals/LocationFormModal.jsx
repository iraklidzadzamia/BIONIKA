"use client";
import { useState, useMemo } from "react";
import { Button, Input, Textarea, Select, PhoneInput } from "@/shared/components/ui";
import {
  useCreateLocationMutation,
  useUpdateLocationMutation,
} from "@/core/api/locationsApi";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tbilisi",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function LocationFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    label: initial?.label || "",
    address: initial?.address || "",
    googleLocationUrl: initial?.googleLocationUrl || "",
    phone: initial?.phone || "",
    timezone: initial?.timezone || "UTC",
    isMain: initial?.isMain || false,
  });
  const [errors, setErrors] = useState({});
  const [createLocation, { isLoading: creating }] = useCreateLocationMutation();
  const [updateLocation, { isLoading: updating }] = useUpdateLocationMutation();

  const validate = () => {
    const next = {};
    if (!form.label.trim()) next.label = "Required";
    if (!form.address.trim()) next.address = "Required";
    if (!form.timezone) next.timezone = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (isEdit) await updateLocation({ id: initial._id, ...payload }).unwrap();
    else await createLocation(payload).unwrap();
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <Input
        label="Label"
        value={form.label}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
        error={errors.label}
        required
      />

      <Textarea
        label="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="Street, building, city, ZIP"
        rows={3}
        error={errors.address}
        required
      />

      <Input
        label="Google Maps URL"
        type="url"
        value={form.googleLocationUrl}
        onChange={(e) =>
          setForm({ ...form, googleLocationUrl: e.target.value })
        }
        placeholder="https://maps.google.com/..."
      />

      <PhoneInput
        label="Phone (optional)"
        value={form.phone}
        onValueChange={(e164) => setForm({ ...form, phone: e164 })}
        defaultCountry="GE"
      />

      <Select
        label="Timezone"
        value={form.timezone}
        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        error={errors.timezone}
        required
      >
        {TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </Select>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isMain}
          onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
        />
        Set as main
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={creating || updating} className="flex-1">
          {isEdit ? "Save" : "Create"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
