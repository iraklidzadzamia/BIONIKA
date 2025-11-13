"use client";
import dynamic from "next/dynamic";
import { PageLoader } from "@/shared/components/ui";

// Lazy load the heavy schedule page component
const SchedulePage = dynamic(
  () =>
    import("@/features/schedule").then((mod) => ({
      default: mod.SchedulePage,
    })),
  {
    loading: () => <PageLoader />,
    ssr: false,
  }
);

export default function Page() {
  return <SchedulePage />;
}
