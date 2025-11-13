"use client";
import React from "react";
import { Button } from "@/shared/components/ui";

export default function AlertDialog({
  title,
  message,
  okText = "OK",
  onOk,
  onClose,
}) {
  const handleOk = () => {
    onOk?.();
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
        <Button type="button" onClick={handleOk}>
          {okText}
        </Button>
      </div>
    </div>
  );
}

