"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { Tabs, ContentLoader } from "@/ui";
import { useGetBotQuery, useUpdateBotMutation } from "@/core/api/settingsApi";
import { useGetCompanyQuery } from "@/core/api/settingsApi";
import { useRouter } from "next/navigation";
import { SectionErrorBoundary } from "@/guards";
import {
  CogIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// Lazy load heavy tab components
const SystemInstructionsTab = dynamic(
  () => import("@/components/aiAgent/SystemInstructionsTab"),
  { ssr: false }
);
const AIAgentActiveHoursCard = dynamic(
  () => import("@/components/aiAgent/AIAgentActiveHoursCard"),
  { ssr: false }
);

const AI_TABS = [
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: CogIcon,
  },
  {
    id: "instructions",
    label: "System Instructions",
    shortLabel: "Instructions",
    icon: SparklesIcon,
  },
];

export default function AISettingsPage() {
  const router = useRouter();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);
  const isManager = !!user && user.role === "manager";

  // API queries
  const { data: botData, refetch: refetchBot } = useGetBotQuery();
  const { data: companyData } = useGetCompanyQuery();

  const [updateBot, { isLoading: isUpdatingBot }] = useUpdateBotMutation();

  // Local state
  const [activeTab, setActiveTab] = useState("settings");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isToggling, setIsToggling] = useState(false);

  // Form states
  const [aiAgentForm, setAiAgentForm] = useState({
    systemInstruction: "",
    active: false,
    activeHours: {
      intervalActive: false,
      startTime: "",
      endTime: "",
      timezone: "",
    },
  });

  // Load data into forms
  useEffect(() => {
    if (botData?.bot) {
      const bot = botData.bot;
      setAiAgentForm({
        systemInstruction: bot.systemInstruction || "",
        active: bot.active || false,
        activeHours: {
          intervalActive: Boolean(bot.activeHours?.intervalActive) || false,
          startTime: bot.activeHours?.startTime || "",
          endTime: bot.activeHours?.endTime || "",
          timezone:
            bot.activeHours?.timezone ||
            (typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone || ""
              : "") ||
            "",
        },
      });
    }
  }, [botData]);

  useEffect(() => {
    if (!companyData?.company) return;

    const company = companyData.company;

    // If bot activeHours timezone is not set yet, default to company timezone
    setAiAgentForm((prev) => {
      const hasTimezone = (prev.activeHours?.timezone || "").trim().length > 0;
      const companyTz = company.timezone || "";
      if (hasTimezone || !companyTz) return prev;
      return {
        ...prev,
        activeHours: {
          ...(prev.activeHours || {}),
          timezone: companyTz,
        },
      };
    });
  }, [companyData]);

  // Access control
  useEffect(() => {
    if (isInitialized && user && !isManager) router.replace("/dashboard");
  }, [isInitialized, user, isManager, router]);

  // Show loading state while checking auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentLoader
          type="spinner"
          size="lg"
          text="Loading AI Settings..."
          variant="primary"
          layout="centered"
        />
      </div>
    );
  }

  if (!user) return null;

  // Success notification function
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Toggle active immediately with optimistic UI
  const handleToggleActive = async () => {
    const previousActive = aiAgentForm.active;
    const nextActive = !previousActive;
    setAiAgentForm((prev) => ({ ...prev, active: nextActive }));
    setIsToggling(true);

    try {
      await updateBot({ active: nextActive }).unwrap();
      showSuccessMessage(
        nextActive ? "AI Agent activated" : "AI Agent deactivated"
      );
      if (typeof refetchBot === "function") {
        refetchBot();
      }
    } catch (error) {
      console.error("Failed to toggle AI Agent:", error);
      setAiAgentForm((prev) => ({ ...prev, active: previousActive }));
    } finally {
      setIsToggling(false);
    }
  };

  // Handle form submissions
  const onSaveAiAgent = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...aiAgentForm,
        activeHours: { ...(aiAgentForm.activeHours || {}) },
      };
      if (!payload.activeHours.intervalActive) {
        if (!payload.activeHours.startTime)
          delete payload.activeHours.startTime;
        if (!payload.activeHours.endTime) delete payload.activeHours.endTime;
      }
      if (!payload.activeHours.startTime) delete payload.activeHours.startTime;
      if (!payload.activeHours.endTime) delete payload.activeHours.endTime;
      if (!payload.activeHours.timezone) delete payload.activeHours.timezone;
      if (
        payload.activeHours &&
        Object.keys(payload.activeHours).length === 0
      ) {
        delete payload.activeHours;
      }

      await updateBot(payload).unwrap();
      showSuccessMessage("All settings saved successfully!");

      if (typeof refetchBot === "function") {
        refetchBot();
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Save only Active Hours section with validation
  const onSaveActiveHours = async () => {
    try {
      const ah = aiAgentForm?.activeHours || {};
      const intervalActive = !!ah.intervalActive;
      const startTime = (ah.startTime || "").trim();
      const endTime = (ah.endTime || "").trim();

      if (intervalActive) {
        if (!startTime || !endTime) {
          alert(
            "Please set both Start Time and End Time when Active Hours are enabled."
          );
          return;
        }
      }

      const payload = {
        active: !!aiAgentForm.active,
        activeHours: {
          intervalActive,
          ...(intervalActive ? { startTime, endTime } : {}),
        },
      };

      await updateBot(payload).unwrap();
      showSuccessMessage("Active hours saved successfully!");
      if (typeof refetchBot === "function") refetchBot();
    } catch (error) {
      console.error("Failed to save active hours:", error);
    }
  };

  const currentTab = AI_TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {successMessage}
            </span>
          </div>
        </div>
      )}

      {/* Mobile Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:hidden">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900">AI Agent</h1>
              <p className="text-xs text-gray-500 truncate">
                {currentTab?.label || "Configuration"}
              </p>
            </div>
            {/* Mobile Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                aiAgentForm.active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  aiAgentForm.active ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {aiAgentForm.active ? "Active" : "Inactive"}
            </div>
          </div>

          {/* Mobile Tab Selector - Horizontal Scroll */}
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-1">
              {AI_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  AI Agent Configuration
                </h1>
                <p className="mt-1 text-sm sm:text-base text-gray-600">
                  Configure your AI receptionist to provide excellent customer
                  service
                </p>
              </div>
            </div>

            {/* Desktop Toggle */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleActive}
                  disabled={isToggling}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    aiAgentForm.active ? "bg-green-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      aiAgentForm.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      aiAgentForm.active
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    {aiAgentForm.active
                      ? "AI Agent Active"
                      : "AI Agent Inactive"}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Tabs Navigation */}
          <Tabs tabs={AI_TABS} value={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Tab Content with Error Boundaries */}
        <SectionErrorBoundary sectionName={`${activeTab} tab`}>
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Active Hours Card */}
              <AIAgentActiveHoursCard
                form={aiAgentForm}
                onChange={setAiAgentForm}
                onSave={onSaveActiveHours}
                saving={isUpdatingBot}
              />
            </div>
          )}

          {activeTab === "instructions" && (
            <SystemInstructionsTab
              form={aiAgentForm}
              onChange={setAiAgentForm}
              onSubmit={onSaveAiAgent}
              isSaving={isUpdatingBot}
            />
          )}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
