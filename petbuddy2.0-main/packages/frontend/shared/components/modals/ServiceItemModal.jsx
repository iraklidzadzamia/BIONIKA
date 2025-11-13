"use client";
import React, { useState } from "react";
import { Input, Select, Button } from "@/shared/components/ui";
import { useSelector } from "react-redux";
import { getCurrencySymbol } from "@/shared/utils";

export default function ServiceItemModal({
  serviceItem,
  service,
  onSave,
  onClose,
}) {
  const company = useSelector((state) => state.auth.company);
  const currencySymbol = getCurrencySymbol(company?.mainCurrency);

  const [formData, setFormData] = useState({
    _id: serviceItem?._id,
    serviceId: service?._id,
    size: serviceItem?.size || "M",
    label: serviceItem?.label || "",
    coatType: serviceItem?.coatType || "all",
    price: serviceItem?.price || 0,
    active: serviceItem?.active !== undefined ? serviceItem.active : true,
    durationMinutes: serviceItem?.durationMinutes || undefined,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const coercedDuration = Number(formData.durationMinutes);
    const finalDuration = Number.isFinite(coercedDuration) && coercedDuration > 0
      ? coercedDuration
      : 60; // sensible default

    const payload = { ...formData, durationMinutes: finalDuration };
    onSave?.(payload);
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Service: {service?.name}</p>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Size"
          value={formData.size}
          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          options={[
            { value: "S", label: "Small" },
            { value: "M", label: "Medium" },
            { value: "L", label: "Large" },
            { value: "XL", label: "Extra Large" },
            { value: "all", label: "All Sizes" },
          ]}
          required
        />
        <Select
          label="Coat Type"
          value={formData.coatType}
          onChange={(e) =>
            setFormData({ ...formData, coatType: e.target.value })
          }
          options={[
            { value: "all", label: "All Coats" },
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "long", label: "Long" },
            { value: "curly", label: "Curly" },
            { value: "double", label: "Double" },
            { value: "wire", label: "Wire" },
            { value: "hairless", label: "Hairless" },
            { value: "unknown", label: "Unknown" },
          ]}
        />
      </div>

      <Input
        label="Label (Optional)"
        value={formData.label}
        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
        placeholder="e.g., Medium Dog, Long Coat"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={`Price (${currencySymbol})`}
          type="number"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: parseFloat(e.target.value) })
          }
          min="0"
          step="0.01"
          required
        />
        <Input
          label="Total Duration (min)"
          type="number"
          value={formData.durationMinutes || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              durationMinutes: parseInt(e.target.value) || undefined,
            })
          }
          placeholder="Enter total service duration"
          min="10"
          max="480"
          required
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
          {serviceItem ? "Update Service Item" : "Add Service Item"}
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
