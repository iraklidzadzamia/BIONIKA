// Deprecated: now replaced by shared/components/modals/AIAgentControlModal and ModalRoot
// Keeping the file to avoid breaking imports during refactor; not used anymore.
import { useState, useEffect } from "react";
import { X, Bot, BotOff, Clock, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/ui";

export default function AIAgentControlModal({
  contact,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}) {
  const [botActive, setBotActive] = useState(true);
  const [suspendUntil, setSuspendUntil] = useState("");
  const [suspendDate, setSuspendDate] = useState("");
  const [suspendTime, setSuspendTime] = useState("");

  useEffect(() => {
    if (contact) {
      setBotActive(!contact.botSuspended);

      // Parse existing botSuspendUntil if present
      if (contact.botSuspendUntil) {
        const date = new Date(contact.botSuspendUntil);
        const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
        const timeStr = date.toTimeString().slice(0, 5); // HH:MM
        setSuspendDate(dateStr);
        setSuspendTime(timeStr);
        setSuspendUntil(contact.botSuspendUntil);
      } else {
        setSuspendDate("");
        setSuspendTime("");
        setSuspendUntil("");
      }
    }
  }, [contact]);

  // Combine date and time when either changes
  useEffect(() => {
    if (suspendDate && suspendTime) {
      const combined = new Date(`${suspendDate}T${suspendTime}`);
      setSuspendUntil(combined.toISOString());
    } else {
      setSuspendUntil("");
    }
  }, [suspendDate, suspendTime]);

  const handleSave = () => {
    onSave({
      botSuspended: !botActive,
      botSuspendUntil: !botActive && suspendUntil ? suspendUntil : null,
    });
  };

  const handleToggleChange = () => {
    const newActive = !botActive;
    setBotActive(newActive);

    // Clear suspend until if activating bot
    if (newActive) {
      setSuspendDate("");
      setSuspendTime("");
      setSuspendUntil("");
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${
                botActive ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {botActive ? (
                <Bot className="w-6 h-6 text-green-600" />
              ) : (
                <BotOff className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                AI Agent Control
              </h2>
              <p className="text-sm text-gray-500">{contact.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Card */}
          <div
            className={`p-4 rounded-xl border-2 ${
              botActive
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {botActive ? (
                <Bot className="w-8 h-8 text-green-600" />
              ) : (
                <BotOff className="w-8 h-8 text-red-600" />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  AI Agent is {botActive ? "Active" : "Suspended"}
                </p>
                <p className="text-sm text-gray-600">
                  {botActive
                    ? "The AI agent will respond to messages automatically"
                    : "The AI agent will not respond to messages"}
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Control */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">
              Agent Status
            </label>
            <button
              onClick={handleToggleChange}
              disabled={isSaving}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                botActive
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:border-green-400"
                  : "bg-gradient-to-r from-red-50 to-orange-50 border-red-300 hover:border-red-400"
              } ${
                isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-8 rounded-full relative transition-all duration-300 ${
                    botActive ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                      botActive ? "left-7" : "left-1"
                    }`}
                  />
                </div>
                <span className="font-medium text-gray-900">
                  {botActive ? "Activate AI Agent" : "Deactivate AI Agent"}
                </span>
              </div>
              {botActive ? (
                <Bot className="w-6 h-6 text-green-600" />
              ) : (
                <BotOff className="w-6 h-6 text-red-600" />
              )}
            </button>
          </div>

          {/* Suspend Until Section - Only shown when bot is suspended */}
          {!botActive && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <label className="block text-sm font-semibold text-gray-900">
                  Auto-Resume Schedule (Optional)
                </label>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Set a date and time to automatically reactivate the AI agent
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Date Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={suspendDate}
                    onChange={(e) => setSuspendDate(e.target.value)}
                    min={getMinDateTime()}
                    disabled={isSaving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Time Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={suspendTime}
                    onChange={(e) => setSuspendTime(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {suspendUntil && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-indigo-900">
                      <strong>Auto-resume scheduled:</strong>
                      <br />
                      {new Date(suspendUntil).toLocaleString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSuspendDate("");
                  setSuspendTime("");
                  setSuspendUntil("");
                }}
                disabled={isSaving || (!suspendDate && !suspendTime)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear schedule
              </button>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">About AI Agent Control</p>
                <ul className="space-y-1 text-xs">
                  <li>
                    • When active, the AI responds automatically to messages
                  </li>
                  <li>• When suspended, you handle all messages manually</li>
                  <li>
                    • Set a resume schedule to temporarily suspend the agent
                  </li>
                  <li>• Changes take effect immediately after saving</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="luxury"
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
