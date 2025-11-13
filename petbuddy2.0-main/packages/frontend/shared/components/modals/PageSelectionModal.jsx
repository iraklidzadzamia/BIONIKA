"use client";
import React, { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui";

export default function PageSelectionModal({ pages = [], onConnect, onClose }) {
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectedCount = selected.size;

  const items = useMemo(() => pages || [], [pages]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-600">
          Choose which Facebook pages and Instagram accounts you want to
          connect:
        </div>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {items.map((page) => (
          <label
            key={page.id}
            className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selected.has(page.id)}
              onChange={() => toggle(page.id)}
              className="text-indigo-600 focus:ring-indigo-500 mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">f</span>
                </div>
                <div className="font-medium text-gray-900">{page.name}</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {page.category}
                </span>
              </div>
              {page.instagram_business_account ? (
                <div className="flex items-center gap-2 ml-8 text-sm text-gray-600">
                  <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">📷</span>
                  </div>
                  Instagram Business Account Connected
                </div>
              ) : (
                <div className="ml-8 text-sm text-gray-500">
                  No Instagram account connected
                </div>
              )}
              <div className="text-xs text-gray-500 ml-8">
                Page ID: {page.id}
              </div>
            </div>
          </label>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500">
            No pages found for this user.
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          onClick={() => onConnect?.(Array.from(selected), onClose)}
          disabled={selectedCount === 0}
        >
          {selectedCount > 0
            ? `Connect ${selectedCount} Selected`
            : "Connect Selected Pages"}
        </Button>
      </div>
    </div>
  );
}
