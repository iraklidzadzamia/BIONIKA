"use client";

import { Card, TimeInput, LabeledSwitch, Input, Button } from "@/shared/components/ui";

export default function AIAgentActiveHoursCard({
  form,
  onChange,
  onSave,
  saving,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="p-4 sm:p-6 flex items-start justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Active Hours (Optional)
              </h3>
              <p className="text-gray-600 mt-1 text-sm">
                Control when the AI agent is allowed to respond.
              </p>
            </div>
            <div className="mt-1 text-xs sm:text-sm text-gray-500">
              Click to expand
            </div>
          </div>
        </summary>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="bg-indigo-50 p-4 sm:p-6 rounded-lg border border-indigo-200">
            <div className="space-y-4">
              <LabeledSwitch
                label="Use Active Hours Schedule"
                description="If enabled, the bot only responds between the specified times."
                checked={!!form?.activeHours?.intervalActive}
                onChange={(checked) =>
                  onChange((prev) => ({
                    ...prev,
                    activeHours: {
                      ...(prev.activeHours || {}),
                      intervalActive: !!checked,
                    },
                  }))
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TimeInput
                  label="Start Time"
                  placeholder="09:00"
                  value={form?.activeHours?.startTime || ""}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      activeHours: {
                        ...(prev.activeHours || {}),
                        startTime: e.target.value,
                      },
                    }))
                  }
                  disabled={!form?.activeHours?.intervalActive}
                  required={!!form?.activeHours?.intervalActive}
                />

                <TimeInput
                  label="End Time"
                  placeholder="18:00"
                  value={form?.activeHours?.endTime || ""}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      activeHours: {
                        ...(prev.activeHours || {}),
                        endTime: e.target.value,
                      },
                    }))
                  }
                  disabled={!form?.activeHours?.intervalActive}
                  required={!!form?.activeHours?.intervalActive}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Tip: Leave disabled to allow the bot 24/7.
                </p>
                {onSave && (
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={onSave}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {saving ? "Saving..." : "Save Active Hours"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
