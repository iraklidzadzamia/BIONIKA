import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/core/providers/StoreProvider";
import SocketInitializer from "@/core/providers/SocketInitializer";
import SocketEffects from "@/core/providers/SocketEffects";
import { ModalRoot } from "@/modals";
import { ErrorBoundary } from "@/guards";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "PetBuddy",
  description: "Booking for grooming salons",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden"
        suppressHydrationWarning={true}
      >
        <ErrorBoundary>
          <StoreProvider>
            <SocketInitializer />
            <SocketEffects />
            {children}
            <ModalRoot />
          </StoreProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
