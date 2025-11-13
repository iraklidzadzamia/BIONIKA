import { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { config } from "@/config/env";

// Socket.io needs direct connection to backend server (cannot use Next.js rewrites)
// In production (Render), use the same origin as the frontend
// In development, use the explicit backend URL
const getSocketUrl = () => {
  // If explicit socket URL is provided, use it
  if (config.socketUrl) {
    return config.socketUrl;
  }

  // In browser, check if we're on production (not localhost)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    // If on Render or any production domain (not localhost)
    if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      // Use the same origin as frontend (backend and frontend are on same domain in production)
      return `${protocol}//${hostname}`;
    }
  }

  // Default to backend origin for development
  return config.backendOrigin;
};

const SOCKET_URL = getSocketUrl();

// Singleton socket instance shared across the app
let socketInstance = null;
let connectionListeners = new Set();

// Reconnection configuration
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

/**
 * Custom hook to manage Socket.io connection
 * Handles connection lifecycle, reconnection, and status updates
 * @returns {object} { socket, isConnected, connectionError }
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const token = useSelector((state) => state.auth.accessToken);
  const company = useSelector((state) => state.auth.company);
  const companyId = company?._id;

  const isAuthenticatedRef = useRef(false);

  // Update connection status callback
  const updateConnectionStatus = useCallback((connected, error = null) => {
    setIsConnected(connected);
    setConnectionError(error);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const isAuthenticated = Boolean(token && companyId);
    isAuthenticatedRef.current = isAuthenticated;

    // Only connect if authenticated
    if (!isAuthenticated) {
      // Disconnect if user logs out but keep instance for potential reconnection
      if (socketInstance?.connected) {
        socketInstance.disconnect();
      }
      updateConnectionStatus(false, null);
      setReconnectAttempts(0);
      return;
    }

    // Create socket instance if it doesn't exist
    if (!socketInstance) {

      socketInstance = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        transports: ["websocket", "polling"],
        ...RECONNECTION_CONFIG,
      });

      // Connection successful
      socketInstance.on("connect", () => {
        setReconnectAttempts(0);

        // Notify all listeners
        connectionListeners.forEach((callback) => {
          callback(true, null);
        });
      });

      // Connection lost
      socketInstance.on("disconnect", (reason) => {
        // Notify all listeners
        connectionListeners.forEach((callback) => {
          callback(false, null);
        });

        // Automatic reconnection is handled by socket.io
        if (reason === "io server disconnect") {
          // Server initiated disconnect, reconnect manually
          if (isAuthenticatedRef.current) {
            socketInstance.connect();
          }
        }
      });

      // Reconnection attempt
      socketInstance.io.on("reconnect_attempt", (attempt) => {
        setReconnectAttempts(attempt);
      });

      // Reconnection successful
      socketInstance.io.on("reconnect", () => {
        setReconnectAttempts(0);
        setConnectionError(null);
      });

      // Connection error
      socketInstance.on("connect_error", (error) => {
        const errorMessage = error.message || "Connection failed";

        // Notify all listeners
        connectionListeners.forEach((callback) => {
          callback(false, errorMessage);
        });
      });

      // Failed to reconnect after all attempts
      socketInstance.io.on("reconnect_failed", () => {
        const errorMessage = "Unable to connect to server. Please check your connection.";

        connectionListeners.forEach((callback) => {
          callback(false, errorMessage);
        });
      });
    } else if (!socketInstance.connected && socketInstance.disconnected) {
      // Reconnect existing socket if disconnected
      socketInstance.auth = { token };
      socketInstance.connect();
    }

    // Register this hook's listener
    connectionListeners.add(updateConnectionStatus);

    // Set initial connection state
    updateConnectionStatus(socketInstance.connected, null);

    // Cleanup: only remove this hook's listener
    return () => {
      connectionListeners.delete(updateConnectionStatus);

      // Only destroy socket if no more listeners (app unmounting)
      if (connectionListeners.size === 0 && socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
        socketInstance = null;
      }
    };
  }, [token, companyId, updateConnectionStatus]);

  return {
    socket: socketInstance,
    isConnected,
    connectionError,
    reconnectAttempts,
  };
}

/**
 * Get the current socket instance (for use outside hooks)
 */
export function getSocket() {
  return socketInstance;
}

/**
 * Check if socket is currently connected
 */
export function isSocketConnected() {
  return socketInstance?.connected || false;
}
