"use client";
import React, { useEffect, useState } from "react";
import {
  Input,
  EmailInput,
  PasswordInput,
  Select,
  Button,
  PhoneInput,
  ColorInput,
} from "@/shared/components/ui";
import { randomPleasantHexColor, isValidHexColor } from "@/shared/utils/color";
import { useListLocationsQuery } from "@/core/api/locationsApi";
import { STAFF_ROLE_OPTIONS } from "@/shared/constants/roles";

export default function StaffFormModal({
  initial,
  onClose,
  onSave,
  saving,
  isManager,
}) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    fullName: initial?.fullName || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    roles: initial?.roles || (initial?.role ? [initial.role] : ["groomer"]),
    password: "",
    color: initial?.color || randomPleasantHexColor(),
    primaryLocationId: initial?.primaryLocationId || "",
  });
  const [errors, setErrors] = useState({});

  // Fetch locations
  const { data: locRes } = useListLocationsQuery();
  const locations = locRes?.items || [];

  useEffect(() => {
    setForm((f) => ({
      ...f,
      fullName: initial?.fullName || "",
      email: initial?.email || "",
      phone: initial?.phone || "",
      roles: initial?.roles || (initial?.role ? [initial.role] : ["groomer"]),
      password: "",
      color: initial?.color || randomPleasantHexColor(),
      primaryLocationId: initial?.primaryLocationId || "",
    }));
  }, [initial]);

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Required";
    if (!form.email.trim()) next.email = "Required";
    if (!isEdit && !form.password.trim()) next.password = "Required";
    if (!form.roles || form.roles.length === 0) next.roles = "At least one role is required";
    if (form.color && !isValidHexColor(form.color)) next.color = "Invalid";
    if (!form.primaryLocationId) next.primaryLocationId = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (isEdit && !payload.password) delete payload.password;
    onSave?.(payload);
    // Don't close immediately - let the parent handle closing after successful save
  };

  if (!isManager) {
    return (
      <div className="text-sm text-gray-600">
        You do not have permission to manage staff.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        label="Full name"
        value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        error={errors.fullName}
        required
      />

      <EmailInput
        label="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
        required
      />

      <PhoneInput
        label="Phone (optional)"
        value={form.phone}
        onValueChange={(e164) => setForm({ ...form, phone: e164 })}
        defaultCountry="GE"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Roles *
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Select which roles this staff member can perform
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
          {STAFF_ROLE_OPTIONS.map((role) => (
            <label
              key={role.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={form.roles.includes(role.value)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({
                    ...form,
                    roles: checked
                      ? [...form.roles, role.value]
                      : form.roles.filter((r) => r !== role.value),
                  });
                }}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-900">{role.label}</span>
            </label>
          ))}
        </div>
        {errors.roles && (
          <p className="text-sm text-red-600 mt-1">{errors.roles}</p>
        )}
      </div>

      <ColorInput
        label="Color"
        value={form.color}
        onChange={(e) => setForm({ ...form, color: e.target.value })}
        error={errors.color}
      />

      <Select
        label="Location"
        value={form.primaryLocationId}
        onChange={(e) =>
          setForm({ ...form, primaryLocationId: e.target.value })
        }
        error={errors.primaryLocationId}
        required
      >
        <option value="">Select Location</option>
        {locations.map((l) => (
          <option key={l._id} value={l._id}>
            {l.label}
          </option>
        ))}
      </Select>

      {!isEdit && (
        <PasswordInput
          label="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          required
        />
      )}

      {isEdit && (
        <PasswordInput
          label="New password (optional)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={saving} className="flex-1">
          Save
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

