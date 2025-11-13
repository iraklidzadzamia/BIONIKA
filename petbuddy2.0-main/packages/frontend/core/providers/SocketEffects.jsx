"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { baseApi } from "@/core/api/baseApi";
import { useSocket } from "@/features/messages/hooks/useSocket";

export default function SocketEffects() {
  const dispatch = useDispatch();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const invalidateAppointments = () => {
      dispatch(
        baseApi.util.invalidateTags([{ type: "Appointments", id: "LIST" }])
      );
    };

    socket.on("appointment:created", invalidateAppointments);
    socket.on("appointment:updated", invalidateAppointments);
    socket.on("appointment:canceled", invalidateAppointments);

    return () => {
      socket.off("appointment:created", invalidateAppointments);
      socket.off("appointment:updated", invalidateAppointments);
      socket.off("appointment:canceled", invalidateAppointments);
    };
  }, [socket, isConnected, dispatch]);

  return null;
}
