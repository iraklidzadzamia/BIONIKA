/**
 * Meta Integration Card Component
 * Clean, focused component for Facebook & Instagram integration
 */
"use client";
import React from "react";
import { Card, Button, Loader } from "@/shared/components/ui";
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { env } from "@/config";
import { useMetaIntegration } from "../hooks/useMetaIntegration";

export default function MetaIntegrationCard() {
  const {
    integration,
    isConnected,
    isConnecting,
    isLoading,
    fbError,
    connect,
    disconnect,
  } = useMetaIntegration();

  const hasAppId = !!env.facebookAppId;
  const hasFacebook = !!integration?.facebookChatId;
  const hasInstagram = !!integration?.instagramChatId;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-7 h-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Meta Business Suite
              </h3>
              <p className="text-sm text-gray-600">
                Facebook & Instagram Messaging
              </p>
            </div>
          </div>
          {isConnected ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Loading State */}
        {isLoading ? (
          <div className="mb-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Connection Status */}
            <div className="mb-6 space-y-3">
              {/* Facebook Status */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  hasFacebook
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      hasFacebook ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Facebook Page
                    </div>
                    {hasFacebook ? (
                      <div className="text-sm text-gray-600">
                        Page ID:{" "}
                        <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-mono">
                          {integration.facebookChatId}
                        </code>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Not connected
                      </div>
                    )}
                  </div>
                </div>
                {hasFacebook && (
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                )}
              </div>

              {/* Instagram Status */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  hasInstagram
                    ? "bg-pink-50 border-pink-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      hasInstagram
                        ? "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Instagram Business
                    </div>
                    {hasInstagram ? (
                      <div className="text-sm text-gray-600">
                        Account ID:{" "}
                        <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-mono">
                          {integration.instagramChatId}
                        </code>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Not connected
                      </div>
                    )}
                  </div>
                </div>
                {hasInstagram && (
                  <CheckCircleIcon className="w-6 h-6 text-pink-600" />
                )}
              </div>
            </div>

            {/* Setup Info */}
            {!isConnected && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                      Before You Connect
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>
                          You must have admin access to your Facebook business
                          page
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>
                          Instagram business account should be linked to
                          Facebook page
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>
                          Grant all requested permissions during Facebook login
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Warning if App ID not configured */}
            {!hasAppId && (
              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                      Configuration Required
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Facebook App ID is not configured. Please contact your
                      administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {fbError && hasAppId && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900 mb-1">
                      Facebook SDK Error
                    </h4>
                    <p className="text-sm text-red-800">{fbError.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={connect}
                disabled={isConnecting || !hasAppId || !!fbError}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader type="spinner" size="sm" variant="default" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    <span>
                      {isConnected ? "Change Connected Page" : "Connect Meta"}
                    </span>
                  </div>
                )}
              </Button>

              {isConnected && (
                <Button
                  onClick={disconnect}
                  disabled={isConnecting}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
