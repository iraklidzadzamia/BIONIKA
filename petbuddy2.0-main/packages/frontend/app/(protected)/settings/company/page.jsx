import dynamic from "next/dynamic";
import { PageLoader } from "@/shared/components/ui";

/**
 * Company Settings Route
 *
 * Note: This page has been refactored from 3,292 lines to a clean entry point.
 * The old implementation is backed up at page.jsx.backup
 *
 * New structure:
 * - Main component: components/company-settings/CompanySettingsPage.jsx
 * - Sections: components/company-settings/components/
 * - Hooks: components/company-settings/hooks/
 */

// Lazy load the heavy company settings page component
const CompanySettingsPage = dynamic(
  () =>
    import("@/components/company-settings").then((mod) => ({
      default: mod.CompanySettingsPage,
    })),
  {
    loading: () => <PageLoader />,
    ssr: false,
  }
);

export default CompanySettingsPage;
