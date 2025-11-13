"use client";
import React, { useState } from "react";
import { Input, Select, Textarea, Button } from "@/shared/components/ui";
import { STAFF_ROLE_OPTIONS } from "@/shared/constants/roles";

export default function ServiceCategoryModal({ service, onSave, onClose }) {
  const [formData, setFormData] = useState({
    _id: service?._id,
    name: service?.name || "",
    description: service?.description || "",
    species: service?.species || "dog",
    requiresBath: service?.requiresBath || false,
    color: service?.color || "#6366f1",
    allowedRoles: service?.allowedRoles || ["groomer"],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Service Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., Full Groom, Bath & Brush"
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Brief description of this service"
      />

      <Select
        label="Species"
        value={formData.species}
        onChange={(e) => setFormData({ ...formData, species: e.target.value })}
        options={[
          { value: "dog", label: "Dog" },
          { value: "cat", label: "Cat" },
          { value: "dog&cat", label: "Dog & Cat" },
          { value: "other", label: "Other" },
        ]}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <input
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="h-10 w-full rounded-md border border-gray-300 cursor-pointer"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.requiresBath}
          onChange={(e) =>
            setFormData({ ...formData, requiresBath: e.target.checked })
          }
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700">Requires Bath</span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allowed Roles
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Select which staff roles can perform this service category
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
          {STAFF_ROLE_OPTIONS.map((role) => (
            <label
              key={role.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={formData.allowedRoles.includes(role.value)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    allowedRoles: checked
                      ? [...formData.allowedRoles, role.value]
                      : formData.allowedRoles.filter((r) => r !== role.value),
                  });
                }}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-900">{role.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {service ? "Update Service Category" : "Add Service Category"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

