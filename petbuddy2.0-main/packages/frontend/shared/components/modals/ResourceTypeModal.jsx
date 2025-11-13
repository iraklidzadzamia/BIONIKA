"use client";
import React, { useState } from "react";
import { Input, Select, Button, Textarea } from "@/shared/components/ui";

export default function ResourceTypeModal({ resourceType, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: resourceType?.name || "",
    description: resourceType?.description || "",
    category: resourceType?.category || "equipment",
    color: resourceType?.color || "#6B7280",
    icon: resourceType?.icon || "cube",
    active: resourceType?.active !== undefined ? resourceType.active : true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., Grooming Tub, Drying Table"
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Brief description of this resource type"
      />

      <Select
        label="Category"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        options={[
          { value: "equipment", label: "Equipment" },
          { value: "space", label: "Space" },
          { value: "staff", label: "Staff" },
          { value: "supply", label: "Supply" },
          { value: "other", label: "Other" },
        ]}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Color"
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="h-12"
        />
        <Input
          label="Icon"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="e.g., cube, droplet, table"
        />
      </div>

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
          {resourceType ? "Update Resource Type" : "Add Resource Type"}
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

