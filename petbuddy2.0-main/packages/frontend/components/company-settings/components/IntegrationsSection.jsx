"use client";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Button, Card, PasswordInput, Loader } from "@/shared/components/ui";
import { SettingsSection } from "@/components/settings";
import {
  useGetIntegrationsQuery,
  useUpsertIntegrationsMutation,
  useConnectMetaPageMutation,
  useLazyGetGoogleAuthUrlQuery,
  useListGoogleCalendarsQuery,
  useGetGoogleSettingsQuery,
  useSelectGoogleCalendarMutation,
  useDisconnectGoogleMutation,
  useUpdateGoogleAutoSyncMutation,
} from "@/core/api/settingsApi";
import { openModal } from "@/core/store/slices/uiSlice";
import { env } from "@/config";
import {
  BoltIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";

/**
 * IntegrationsSection Component
 * Manages third-party integrations (Meta/Facebook, Instagram, OpenAI, Google Calendar)
 */
export default function IntegrationsSection() {
  const dispatch = useDispatch();
  const {
    data: integrationsData,
    isLoading: integrationsLoading,
    refetch: refetchIntegrations,
  } = useGetIntegrationsQuery();
  const [upsertIntegrations] = useUpsertIntegrationsMutation();
  const [connectMetaPage] = useConnectMetaPageMutation();

  const [isMetaIntegrationLoading, setIsMetaIntegrationLoading] =
    useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Log component mount and environment
  useEffect(() => {
    console.log("IntegrationsSection mounted");
    console.log("Environment config:", {
      facebookAppId: env.facebookAppId,
      apiBaseUrl: env.apiBaseUrl,
      backendOrigin: env.backendOrigin,
    });
  }, []);

  // Initialize Facebook SDK when component mounts
  useEffect(() => {
    loadFacebookSDK()
      .then(() => {
        if (typeof FB !== "undefined") {
          FB.init({
            appId: env.facebookAppId,
            cookie: true,
            xfbml: true,
            version: "v18.0",
          });
        }
      })
      .catch((error) => {
        console.error("Failed to load Facebook SDK:", error);
      });
  }, []);

  const loadFacebookSDK = () => {
    return new Promise((resolve, reject) => {
      if (document.getElementById("facebook-jssdk")) {
        resolve();
        return;
      }
      if (typeof FB !== "undefined") {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        setTimeout(() => {
          if (typeof FB !== "undefined") {
            resolve();
          } else {
            reject(
              new Error("Facebook SDK loaded but FB object not available")
            );
          }
        }, 100);
      };
      script.onerror = () => reject(new Error("Failed to load Facebook SDK"));

      document.head.appendChild(script);
    });
  };

  const handleMetaIntegrationSetup = async () => {
    console.log("=== handleMetaIntegrationSetup called ===");

    try {
      console.log("Facebook App ID from env:", env.facebookAppId);
      console.log("typeof FB:", typeof FB);

      // Check if Facebook App ID is configured
      if (!env.facebookAppId || env.facebookAppId.trim() === "") {
        console.error("Facebook App ID is not configured");
        dispatch(
          openModal({
            id: "ALERT_DIALOG",
            props: {
              message:
                "Facebook integration is not configured. Please add NEXT_PUBLIC_FACEBOOK_APP_ID to your environment variables and rebuild the application.",
            },
            ui: { title: "Configuration Error", showClose: true, size: "md", align: "top" },
          })
        );
        return;
      }

      setIsMetaIntegrationLoading(true);
      console.log("Loading state set to true");

      if (typeof FB === "undefined") {
        console.log("FB is undefined, loading SDK...");
        try {
          await loadFacebookSDK();
          console.log("FB SDK loaded successfully, typeof FB:", typeof FB);
        } catch (sdkError) {
          console.error("Failed to load FB SDK:", sdkError);
          throw new Error(`Failed to load Facebook SDK: ${sdkError.message}`);
        }
      } else {
        console.log("FB SDK already loaded");
      }

      if (typeof FB === "undefined") {
        throw new Error("Facebook SDK failed to load. FB is still undefined.");
      }

      console.log("Initializing FB with App ID:", env.facebookAppId);
      FB.init({
        appId: env.facebookAppId,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });

      console.log("FB.login about to be called...");
      FB.login(
        (loginResponse) => {
          console.log("FB.login callback triggered:", loginResponse);

          if (loginResponse.status === "connected") {
            console.log("User connected successfully");
            const userAccessToken = loginResponse.authResponse?.accessToken;
            console.log("User access token obtained:", userAccessToken ? "Yes" : "No");
            showPageSelectionDialog(userAccessToken);
          } else {
            console.error("Facebook login failed:", loginResponse);
            if (loginResponse.status === "not_authorized") {
              dispatch(
                openModal({
                  id: "ALERT_DIALOG",
                  props: {
                    message:
                      "Facebook login was cancelled or not authorized. Please try again and grant the required permissions.",
                  },
                  ui: {
                    title: "Authorization Required",
                    showClose: true,
                    size: "sm",
                    align: "top",
                  },
                })
              );
            } else {
              dispatch(
                openModal({
                  id: "ALERT_DIALOG",
                  props: {
                    message: `Facebook login failed with status: ${loginResponse.status}. Please try again.`,
                  },
                  ui: {
                    title: "Error",
                    showClose: true,
                    size: "sm",
                    align: "top",
                  },
                })
              );
            }
            setIsMetaIntegrationLoading(false);
          }
        },
        {
          scope:
            "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_messages",
          auth_type: "rerequest",
        }
      );
      console.log("FB.login called successfully");
    } catch (error) {
      console.error("=== Error in handleMetaIntegrationSetup ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: {
            message: `Failed to setup Meta integration: ${error.message || "Unknown error"}`,
          },
          ui: { title: "Error", showClose: true, size: "sm", align: "top" },
        })
      );
      setIsMetaIntegrationLoading(false);
    }
  };

  const showPageSelectionDialog = (userAccessToken) => {
    console.log("Fetching user's Facebook pages...");
    FB.api(
      "/me/accounts",
      {
        fields: "id,name,category,instagram_business_account,access_token",
        access_token: userAccessToken,
        limit: 200,
      },
      (response) => {
        console.log("FB.api /me/accounts response:", response);

        if (response.data && response.data.length > 0) {
          console.log(`Found ${response.data.length} page(s)`);

          dispatch(
            openModal({
              id: "PAGE_SELECTION",
              props: {
                pages: response.data,
                userAccessToken,
                // Modal expects 'onConnect' with array of selected page IDs
                onConnect: async (selectedPageIds, closeModal) => {
                  console.log("onConnect called with IDs:", selectedPageIds);

                  if (selectedPageIds.length === 0) {
                    console.warn("No pages selected");
                    return;
                  }

                  // Only connect the first selected page
                  const pageId = selectedPageIds[0];
                  const selectedPage = response.data.find(p => p.id === pageId);

                  console.log("Selected page:", selectedPage);

                  if (selectedPage) {
                    await handlePageConnection(selectedPage, userAccessToken);
                    closeModal?.();
                  } else {
                    console.error("Selected page not found in response data");
                  }
                },
                onClose: () => {
                  console.log("Modal closed");
                  setIsMetaIntegrationLoading(false);
                },
              },
              ui: {
                title: "Select Facebook Page",
                showClose: true,
                size: "md",
                align: "top",
              },
            })
          );
          setIsMetaIntegrationLoading(false);
        } else {
          console.warn("No Facebook pages found for this user");
          dispatch(
            openModal({
              id: "ALERT_DIALOG",
              props: {
                message:
                  "No Facebook pages found. Make sure you have admin access to at least one Facebook page.",
              },
              ui: {
                title: "No Pages Found",
                showClose: true,
                size: "sm",
                align: "top",
              },
            })
          );
          setIsMetaIntegrationLoading(false);
        }
      }
    );
  };

  const handlePageConnection = async (page, userAccessToken) => {
    try {
      const pageId = page.id;
      const pageName = page.name;
      const pageCategory = page.category;
      const pageAccessToken = page.access_token;

      // Get Instagram account ID if available
      let instagramChatId = "";
      if (page.instagram_business_account) {
        instagramChatId = page.instagram_business_account.id;
      }

      // Connect Facebook page - this will exchange token and subscribe webhooks
      const result = await connectMetaPage({
        pageId,
        pageName,
        pageCategory,
        userAccessToken,
        pageAccessToken,
      }).unwrap();

      // If Instagram is connected, update it separately
      if (instagramChatId) {
        await upsertIntegrations({ instagramChatId }).unwrap();
      }

      await refetchIntegrations();

      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: {
            message: instagramChatId
              ? "Facebook and Instagram connected successfully!"
              : "Facebook connected successfully!",
          },
          ui: {
            title: "Success",
            showClose: true,
            size: "sm",
            align: "top",
          },
        })
      );
    } catch (error) {
      console.error("Failed to connect pages:", error);
      const errorMessage = error?.data?.error?.details || error?.data?.error?.message || "Failed to connect pages. Please try again.";
      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: { message: errorMessage },
          ui: { title: "Error", showClose: true, size: "sm", align: "top" },
        })
      );
    }
  };

  const disconnectMetaIntegration = async () => {
    try {
      let proceed = false;
      const doDisconnect = async () => {
        proceed = true;
      };
      await new Promise((resolve) => {
        dispatch(
          openModal({
            id: "CONFIRM_DIALOG",
            props: {
              message:
                "Are you sure you want to disconnect the Meta integration? This will remove all Facebook and Instagram connections.",
              confirmText: "Disconnect",
              cancelText: "Cancel",
              onConfirm: () => {
                doDisconnect();
                resolve();
              },
              onCancel: resolve,
            },
            ui: {
              title: "Confirm Disconnect",
              showClose: true,
              size: "sm",
              align: "top",
            },
          })
        );
      });

      if (!proceed) return;

      setIsDisconnecting(true);

      const integrationData = {
        facebookChatId: "",
        facebookAccessToken: "",
        instagramChatId: "",
      };

      await upsertIntegrations(integrationData).unwrap();
      await refetchIntegrations();

      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: {
            message: "Meta integration disconnected successfully!",
          },
          ui: {
            title: "Success",
            showClose: true,
            size: "sm",
            align: "top",
          },
        })
      );
    } catch (error) {
      console.error("Failed to disconnect Meta integration:", error);
      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: {
            message: "Failed to disconnect Meta integration. Please try again.",
          },
          ui: { title: "Error", showClose: true, size: "sm", align: "top" },
        })
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleUpdateOpenAIKey = async () => {
    const newKey = prompt("Enter your OpenAI API Key:");
    if (newKey) {
      try {
        await upsertIntegrations({ openaiApiKey: newKey }).unwrap();
        await refetchIntegrations();
        dispatch(
          openModal({
            id: "ALERT_DIALOG",
            props: {
              message: "OpenAI API key updated successfully!",
            },
            ui: {
              title: "Success",
              showClose: true,
              size: "sm",
              align: "top",
            },
          })
        );
      } catch (error) {
        console.error("Failed to update OpenAI API key:", error);
        dispatch(
          openModal({
            id: "ALERT_DIALOG",
            props: {
              message: "Failed to update OpenAI API key. Please try again.",
            },
            ui: {
              title: "Error",
              showClose: true,
              size: "sm",
              align: "top",
            },
          })
        );
      }
    }
  };

  const integration = integrationsData?.integration;
  const hasMetaConnection =
    integration?.facebookChatId || integration?.instagramChatId;
  const hasOpenAI = !!integration?.openaiApiKey;

  return (
    <SettingsSection
      title="Integrations"
      description="Connect third-party services to enhance your business capabilities"
      icon={BoltIcon}
    >
      <div className="space-y-6">
        {/* Meta/Facebook Integration Card */}
        <Card className="overflow-hidden">
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
                    Facebook & Instagram Messaging Integration
                  </p>
                </div>
              </div>
              {hasMetaConnection ? (
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

          <div className="p-6">
            {/* Connection Status */}
            {integrationsLoading ? (
              <div className="mb-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 space-y-3">
                {/* Facebook Status */}
                <div
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    integration?.facebookChatId
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        integration?.facebookChatId
                          ? "bg-blue-600"
                          : "bg-gray-300"
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
                      {integration?.facebookChatId ? (
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
                  {integration?.facebookChatId && (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  )}
                </div>

                {/* Instagram Status */}
                <div
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    integration?.instagramChatId
                      ? "bg-pink-50 border-pink-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        integration?.instagramChatId
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
                      {integration?.instagramChatId ? (
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
                  {integration?.instagramChatId && (
                    <CheckCircleIcon className="w-6 h-6 text-pink-600" />
                  )}
                </div>
              </div>
            )}

            {/* Setup Info */}
            {!hasMetaConnection && (
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
            {!env.facebookAppId && (
              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                      ⚠️ Configuration Required
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Facebook App ID is not configured. The integration will not work until this is set up.
                    </p>
                    <div className="bg-amber-100 p-3 rounded border border-amber-200">
                      <p className="text-xs font-semibold text-amber-900 mb-1">
                        Required Steps:
                      </p>
                      <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                        <li>Add <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id</code> to <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">.env</code></li>
                        <li>Rebuild the application: <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">npm run build</code></li>
                        <li>Restart the server: <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">npm start</code></li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  console.log("Connect button clicked!");
                  console.log("Facebook App ID available:", !!env.facebookAppId);
                  handleMetaIntegrationSetup();
                }}
                disabled={isMetaIntegrationLoading || !env.facebookAppId}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMetaIntegrationLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader type="spinner" size="sm" variant="default" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    <span>
                      {hasMetaConnection
                        ? "Change Connected Page"
                        : "Connect Meta Account"}
                    </span>
                  </div>
                )}
              </Button>

              {hasMetaConnection && (
                <Button
                  onClick={disconnectMetaIntegration}
                  disabled={isDisconnecting}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  {isDisconnecting ? (
                    <div className="flex items-center gap-2">
                      <Loader type="spinner" size="sm" variant="danger" />
                      <span>Disconnecting...</span>
                    </div>
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* OpenAI Integration Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    OpenAI Integration
                  </h3>
                  <p className="text-sm text-gray-600">
                    AI-Powered Features & Automation
                  </p>
                </div>
              </div>
              {hasOpenAI ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Features Info */}
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-3">
                <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900 mb-2">
                    Enabled Features
                  </h4>
                  <ul className="text-sm text-emerald-800 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>Smart customer response suggestions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>Automated image analysis and tagging</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>Intelligent appointment scheduling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>Content generation for marketing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* API Key Status */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key Status
              </label>
              <div className="flex gap-3">
                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {hasOpenAI ? (
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
                        API Key Configured
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-gray-600">
                        No API Key Set
                      </span>
                    </div>
                  )}
                  {hasOpenAI && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your API key is securely encrypted and stored
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleUpdateOpenAIKey}
                  variant={hasOpenAI ? "outline" : "primary"}
                  className={
                    !hasOpenAI ? "bg-emerald-600 hover:bg-emerald-700" : ""
                  }
                >
                  {hasOpenAI ? "Update Key" : "Add API Key"}
                </Button>
              </div>
            </div>

            {/* Help Text */}
            {!hasOpenAI && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  Get your OpenAI API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                  >
                    OpenAI Platform
                  </a>
                  . Keys should start with{" "}
                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                    sk-
                  </code>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Google Calendar Integration Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CalendarIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Google Calendar
                  </h3>
                  <p className="text-sm text-gray-600">
                    Sync appointments with Google Calendar
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <GoogleCalendarSection />
          </div>
        </Card>
      </div>
    </SettingsSection>
  );
}

/**
 * Google Calendar Integration Component
 */
function GoogleCalendarSection() {
  const dispatch = useDispatch();
  const [selected, setSelected] = useState("");
  const [triggerAuthUrl] = useLazyGetGoogleAuthUrlQuery();
  const { data: googleSettings, refetch: refetchSettings } =
    useGetGoogleSettingsQuery();

  const connected = !!googleSettings?.settings?.connected;
  const autoSync = !!googleSettings?.settings?.autoSync;
  const accountEmail = googleSettings?.settings?.accountEmail || "";
  const calendarName = googleSettings?.settings?.calendarName || "";
  const lastSync = googleSettings?.settings?.lastSync
    ? new Date(googleSettings.settings.lastSync)
    : null;

  // Only fetch calendars when connected
  const { data: calendarsData, refetch: refetchCalendars } =
    useListGoogleCalendarsQuery(undefined, { skip: !connected });
  const [selectCalendar, { isLoading: isSelecting }] =
    useSelectGoogleCalendarMutation();
  const [disconnectGoogle, { isLoading: isDisconnecting }] =
    useDisconnectGoogleMutation();
  const [updateAutoSync, { isLoading: isUpdatingAuto }] =
    useUpdateGoogleAutoSyncMutation();

  return (
    <div>
      {/* Connection Status Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-gray-700">
              Connection Status
            </div>
            {connected && accountEmail && (
              <div className="text-sm text-gray-600 mt-1">
                Signed in as{" "}
                <span className="font-medium text-gray-900">
                  {accountEmail}
                </span>
              </div>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full ${
              connected
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            ></div>
            {connected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {connected && calendarName && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>
                Active Calendar:{" "}
                <span className="font-semibold">{calendarName}</span>
              </span>
            </div>
          </div>
        )}

        {connected && lastSync && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <ArrowPathIcon className="w-4 h-4" />
            <span>Last synced: {lastSync.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Not Connected State */}
      {!connected ? (
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <LinkIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Connect Google Calendar
            </h4>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Automatically sync your appointments to Google Calendar and keep
              your schedule up to date across all devices.
            </p>
          </div>
          <Button
            onClick={async () => {
              const res = await triggerAuthUrl().unwrap();
              const url = res?.url;
              if (url) {
                window.location.href = url;
              }
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Connect with Google
            </div>
          </Button>
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-6">
          {/* Calendar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Calendar
            </label>
            <div className="flex gap-3">
              <select
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Choose a calendar...</option>
                {(calendarsData?.calendars || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary} {c.primary ? "(Primary)" : ""}
                  </option>
                ))}
              </select>
              <Button
                disabled={!selected || isSelecting}
                onClick={async () => {
                  await selectCalendar({ calendarId: selected }).unwrap();
                  await refetchSettings();
                }}
              >
                {isSelecting ? (
                  <div className="flex items-center gap-2">
                    <Loader type="spinner" size="sm" />
                    Saving...
                  </div>
                ) : (
                  "Use Calendar"
                )}
              </Button>
            </div>
          </div>

          {/* Auto-sync Toggle */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 mb-1">
                  Auto-Sync Appointments
                </div>
                <p className="text-sm text-gray-600">
                  Automatically sync new and updated appointments to Google
                  Calendar
                </p>
              </div>
              <button
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  autoSync ? "bg-green-500" : "bg-gray-300"
                }`}
                onClick={async () => {
                  await updateAutoSync({ autoSync: !autoSync }).unwrap();
                  await refetchSettings();
                }}
                disabled={isUpdatingAuto}
              >
                <span
                  className={`absolute top-0.5 ${
                    autoSync ? "left-7" : "left-0.5"
                  } w-6 h-6 bg-white rounded-full shadow-md transition-all`}
                />
              </button>
            </div>
          </div>

          {/* Disconnect Button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              disabled={isDisconnecting}
              onClick={async () => {
                await disconnectGoogle().unwrap();
                await Promise.all([refetchCalendars(), refetchSettings()]);
              }}
              className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
            >
              {isDisconnecting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader type="spinner" size="sm" variant="danger" />
                  Disconnecting...
                </div>
              ) : (
                "Disconnect Google Calendar"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
