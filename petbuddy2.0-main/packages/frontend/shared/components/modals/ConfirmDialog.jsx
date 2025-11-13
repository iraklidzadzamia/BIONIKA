"use client";
import React from "react";
import { Button } from "@/shared/components/ui";

export default function ConfirmDialog({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  onClose,
}) {
  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };
  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };
  return (
    <div className="space-y-4">
      {message && (
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {message}
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          {cancelText}
        </Button>
        <Button
          type="button"
          className="bg-red-600 hover:bg-red-700"
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
}

