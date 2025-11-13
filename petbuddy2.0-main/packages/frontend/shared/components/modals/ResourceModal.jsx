"use client";
import React, { useState } from "react";
import { Input, Select, Button } from "@/shared/components/ui";

export default function ResourceModal({
  resource,
  resourceTypes = [],
  initialResourceTypeId = "",
  onSave,
  onClose,
}) {
  const [formData, setFormData] = useState({
    resourceTypeId: resource?.resourceTypeId || initialResourceTypeId || "",
    label: resource?.label || "",
    capacity: resource?.capacity || 1,
    active: resource?.active !== undefined ? resource.active : true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Resource Type"
        value={formData.resourceTypeId}
        onChange={(e) =>
          setFormData({ ...formData, resourceTypeId: e.target.value })
        }
        options={[
          { value: "", label: "Select Resource Type" },
          ...resourceTypes.map((rt) => ({ value: rt._id, label: rt.name })),
        ]}
        required
      />

      <Input
        label="Label"
        value={formData.label}
        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
      />

      <Input
        label="Capacity"
        type="number"
        value={formData.capacity}
        onChange={(e) =>
          setFormData({ ...formData, capacity: parseInt(e.target.value) })
        }
        min="1"
        max="100"
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.active}
          onChange={(e) =>
            setFormData({ ...formData, active: e.target.checked })
          }
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700">Active</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {resource ? "Update Resource" : "Add Resource"}
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

