"use client";
import React, { useEffect, useState } from "react";
import { Button, Card, Input, ContentLoader } from "@/shared/components/ui";
import {
  useGetStaffScheduleQuery,
  useSaveStaffScheduleMutation,
} from "@/core/api/baseApi";

function defaultScheduleRows() {
  return Array.from({ length: 7 }).map(() => ({
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
    breaks: [],
  }));
}

export default function StaffScheduleModal({ staff, onClose }) {
  const effectiveId = staff?.id || staff?._id;
  const { data, isFetching } = useGetStaffScheduleQuery({ id: effectiveId });
  const [saveSchedule, { isLoading: saving }] = useSaveStaffScheduleMutation();

  const [rows, setRows] = useState(() => defaultScheduleRows());

  useEffect(() => {
    const items = data?.items || [];
    const next = defaultScheduleRows();
    items.forEach((it) => {
      next[it.weekday] = {
        enabled: true,
        startTime: it.startTime,
        endTime: it.endTime,
        breaks: (it.breakWindows || []).map((b) => ({
          start: b.start,
          end: b.end,
        })),
      };
    });
    setRows(next);
  }, [data]);

  const submit = async (e) => {
    e.preventDefault();
    const schedule = rows
      .map((r, weekday) => ({ weekday, ...r }))
      .filter((r) => r.enabled)
      .map((r) => ({
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        breakWindows: r.breaks,
      }));
    try {
      await saveSchedule({ id: effectiveId, schedule }).unwrap();
      onClose?.();
    } catch (err) {
      // Surface error via global alert dialog
      if (typeof window !== "undefined") {
        const evt = new CustomEvent("pb:openAlert", {
          detail: "Failed to save schedule",
        });
        window.dispatchEvent(evt);
      }
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col h-full">
      {isFetching ? (
        <div className="p-6">
          <ContentLoader
            type="skeleton"
            layout="centered"
            padding="lg"
            fullWidth
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <WeeklyGrid rows={rows} setRows={setRows} />
          </div>
          <div className="sticky bottom-0 w-full border-t bg-white/95 backdrop-blur px-4 py-4 flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">
              Save Schedule
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
        </div>
      )}
    </form>
  );
}

function WeeklyGrid({ rows, setRows }) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const copyToWeek = (fromIdx) => {
    const from = rows[fromIdx];
    if (!from.enabled) return;
    const next = rows.map((r, i) => (i === fromIdx ? r : { ...r, ...from }));
    setRows(next);
  };

  const setDay = (idx, patch) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };

  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <Card key={i} padding="sm" className="space-y-4">
          {/* Day Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">
                  {labels[i]}
                </span>
              </div>
              <label className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => setDay(i, { enabled: e.target.checked })}
                  aria-label={`Enable ${labels[i]} schedule`}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Working Day
                </span>
              </label>
            </div>
            {r.enabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyToWeek(i)}
                className="text-xs"
              >
                Copy to all
              </Button>
            )}
          </div>

          {/* Time Settings */}
          {r.enabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={r.startTime}
                    onChange={(e) => setDay(i, { startTime: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={r.endTime}
                    onChange={(e) => setDay(i, { endTime: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              <BreaksEditor
                breaks={r.breaks}
                onChange={(next) => setDay(i, { breaks: next })}
                disabled={false}
              />
            </div>
          )}

          {!r.enabled && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Day off - No schedule needed
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function BreaksEditor({ breaks = [], onChange, disabled }) {
  const add = () =>
    onChange([...(breaks || []), { start: "12:00", end: "12:30" }]);
  const setAt = (idx, patch) => {
    const next = breaks.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const remove = (idx) => onChange(breaks.filter((_, i) => i !== idx));
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Break Times</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={add}
            disabled={disabled}
            className="text-xs px-3 py-1.5"
          >
            + Add Break
          </Button>
          {breaks.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange([])}
              disabled={disabled}
              className="text-xs px-3 py-1.5"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {breaks.length === 0 ? (
        <div className="text-center py-3 text-gray-400 text-sm bg-gray-50 rounded-lg">
          No breaks scheduled
        </div>
      ) : (
        <div className="space-y-3">
          {breaks.map((b, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Start
                </label>
                <Input
                  type="time"
                  value={b.start}
                  onChange={(e) => setAt(idx, { start: e.target.value })}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  End
                </label>
                <Input
                  type="time"
                  value={b.end}
                  onChange={(e) => setAt(idx, { end: e.target.value })}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => remove(idx)}
                disabled={disabled}
                className="px-2 py-1.5"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

