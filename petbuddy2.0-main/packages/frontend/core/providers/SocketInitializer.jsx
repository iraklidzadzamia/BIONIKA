"use client";
import { useSocket } from "@/features/messages/hooks/useSocket";

export default function SocketInitializer() {
  // Initialize and keep the singleton socket connected globally when authenticated
  useSocket();
  return null;
}
