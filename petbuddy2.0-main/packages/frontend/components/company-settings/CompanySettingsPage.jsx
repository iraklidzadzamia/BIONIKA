"use client";
import { useState } from "react";
import { Tabs, PageLoader } from "@/ui";
import {
  LocationsSection,
  CompanyInfoSection,
  ServicesSection,
  ResourcesSection,
  WorkingHoursSection,
  IntegrationsSection,
} from "./components";
import { SectionErrorBoundary } from "@/guards";
import { useSelector } from "react-redux";
import {
  MapPinIcon,
  BuildingOfficeIcon,
  ScissorsIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  BoltIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const SETTINGS_TABS = [
  {
    id: "company",
    label: "Company Info",
    shortLabel: "Company",
    icon: BuildingOfficeIcon,
  },
  {
    id: "locations",
    label: "Locations",
    shortLabel: "Locations",
    icon: MapPinIcon,
  },
  {
    id: "services",
    label: "Services",
    shortLabel: "Services",
    icon: ScissorsIcon,
  },
  {
    id: "resources",
    label: "Resources",
    shortLabel: "Resources",
    icon: WrenchScrewdriverIcon,
  },
  { id: "hours", label: "Working Hours", shortLabel: "Hours", icon: ClockIcon },
  {
    id: "integrations",
    label: "Integrations",
    shortLabel: "Connect",
    icon: BoltIcon,
  },
];

/**
 * Main Company Settings Page
 * Mobile-friendly responsive design with improved UX
 */
export default function CompanySettingsPage() {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("company");

  if (!user?.companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <BuildingOfficeIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
            No Company Found
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            You need to be associated with a company to access settings.
          </p>
        </div>
      </div>
    );
  }

  const currentTab = SETTINGS_TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:hidden">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Cog6ToothIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Settings</h1>
              <p className="text-xs text-gray-500">
                {currentTab?.label || "Company"}
              </p>
            </div>
          </div>

          {/* Mobile Tab Selector - Horizontal Scroll */}
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-1">
              {SETTINGS_TABS.map((tab) => {
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
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Cog6ToothIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Company Settings
              </h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600">
                Manage your company information, services, and integrations
              </p>
            </div>
          </div>

          {/* Desktop Tabs Navigation */}
          <Tabs
            tabs={SETTINGS_TABS}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <SectionErrorBoundary sectionName={`${activeTab} settings`}>
          {activeTab === "locations" && <LocationsSection />}
          {activeTab === "company" && <CompanyInfoSection />}
          {activeTab === "services" && <ServicesSection />}
          {activeTab === "resources" && <ResourcesSection />}
          {activeTab === "hours" && <WorkingHoursSection />}
          {activeTab === "integrations" && <IntegrationsSection />}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
