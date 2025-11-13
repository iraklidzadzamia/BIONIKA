"use client";
import dynamic from "next/dynamic";
import { PageLoader } from "@/shared/components/ui";

// Lazy load the messages page component
const MessagesPage = dynamic(
  () =>
    import("@/features/messages/components/MessagesPage").then((mod) => ({
      default: mod.MessagesPage,
    })),
  {
    loading: () => <PageLoader />,
    ssr: false,
  }
);

export default function Page() {
  return <MessagesPage />;
}
