import { Tabs } from "@/shared/components/ui";

/**
 * Reusable settings tabs component
 */
export default function SettingsTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="mb-6">
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={onTabChange}
        variant="pills"
      />
    </div>
  );
}
