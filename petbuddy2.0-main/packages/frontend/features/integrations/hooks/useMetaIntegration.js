/**
 * Meta Integration Hook
 * Handles Facebook and Instagram connection logic
 */
import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { openModal, closeModal } from "@/core/store/slices/uiSlice";
import { useGetIntegrationsQuery } from "@/core/api/settingsApi";
import {
  useConnectFacebookPageMutation,
  useDisconnectFacebookMutation,
  useDisconnectInstagramMutation,
} from "@/core/api/metaApi";
import { useFacebookSDK } from "./useFacebookSDK";

export function useMetaIntegration() {
  const dispatch = useDispatch();
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    data: integrationsData,
    isLoading: isLoadingIntegrations,
    refetch: refetchIntegrations,
  } = useGetIntegrationsQuery();

  const [connectFacebookPage] = useConnectFacebookPageMutation();
  const [disconnectFacebook] = useDisconnectFacebookMutation();
  const [disconnectInstagram] = useDisconnectInstagramMutation();

  const { isLoaded: isFBLoaded, error: fbError, login, getPages } = useFacebookSDK();

  const integration = integrationsData?.integration;
  const isConnected = !!(
    integration?.facebookChatId || integration?.instagramChatId
  );

  // Connect Facebook page
  const connect = useCallback(async () => {
    if (!isFBLoaded) {
      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: {
            message: fbError?.message || "Facebook SDK not loaded. Please refresh and try again.",
          },
          ui: { title: "Error", showClose: true, size: "sm", align: "top" },
        })
      );
      return;
    }

    setIsConnecting(true);

    try {
      // Step 1: Facebook Login
      const authResponse = await login();
      const userAccessToken = authResponse.accessToken;

      // Step 2: Get user's pages
      const pages = await getPages(userAccessToken);

      if (!pages || pages.length === 0) {
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
        setIsConnecting(false);
        return;
      }

      // Step 3: Show page selection modal
      dispatch(
        openModal({
          id: "PAGE_SELECTION",
          props: {
            pages,
            onConnect: async (selectedPageIds, closeModalFn) => {
              try {
                if (selectedPageIds.length === 0) {
                  return;
                }

                // Get the selected page
                const pageId = selectedPageIds[0];
                const selectedPage = pages.find((p) => p.id === pageId);

                if (!selectedPage) {
                  throw new Error("Selected page not found");
                }

                // Step 4: Connect the page via API
                await connectFacebookPage({
                  pageId: selectedPage.id,
                  pageName: selectedPage.name,
                  pageCategory: selectedPage.category,
                  userAccessToken,
                  instagramChatId: selectedPage.instagram_business_account?.id || null,
                }).unwrap();

                // Step 5: Refresh integrations
                await refetchIntegrations();

                // Close modal
                closeModalFn?.();

                // Show success message
                dispatch(
                  openModal({
                    id: "ALERT_DIALOG",
                    props: {
                      message: selectedPage.instagram_business_account
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
                const errorMessage =
                  error?.data?.error?.details ||
                  error?.data?.error?.message ||
                  error?.message ||
                  "Failed to connect page. Please try again.";

                dispatch(
                  openModal({
                    id: "ALERT_DIALOG",
                    props: { message: errorMessage },
                    ui: {
                      title: "Error",
                      showClose: true,
                      size: "sm",
                      align: "top",
                    },
                  })
                );
              } finally {
                setIsConnecting(false);
              }
            },
            onClose: () => {
              setIsConnecting(false);
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
    } catch (error) {
      let errorMessage = "Failed to connect Facebook. Please try again.";

      if (error.message === "User denied permissions") {
        errorMessage =
          "You must grant the required permissions to connect Facebook and Instagram.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(
        openModal({
          id: "ALERT_DIALOG",
          props: { message: errorMessage },
          ui: { title: "Error", showClose: true, size: "sm", align: "top" },
        })
      );

      setIsConnecting(false);
    }
  }, [
    isFBLoaded,
    fbError,
    login,
    getPages,
    dispatch,
    connectFacebookPage,
    refetchIntegrations,
  ]);

  // Disconnect Meta integration
  const disconnect = useCallback(async () => {
    return new Promise((resolve) => {
      dispatch(
        openModal({
          id: "CONFIRM_DIALOG",
          props: {
            message:
              "Are you sure you want to disconnect Meta integration? This will remove all Facebook and Instagram connections.",
            confirmText: "Disconnect",
            cancelText: "Cancel",
            onConfirm: async () => {
              try {
                // Disconnect Facebook
                if (integration?.facebookChatId) {
                  await disconnectFacebook().unwrap();
                }

                // Disconnect Instagram
                if (integration?.instagramChatId) {
                  await disconnectInstagram().unwrap();
                }

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

                resolve(true);
              } catch (error) {
                dispatch(
                  openModal({
                    id: "ALERT_DIALOG",
                    props: {
                      message: "Failed to disconnect. Please try again.",
                    },
                    ui: {
                      title: "Error",
                      showClose: true,
                      size: "sm",
                      align: "top",
                    },
                  })
                );
                resolve(false);
              }
            },
            onCancel: () => resolve(false),
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
  }, [dispatch, disconnectFacebook, disconnectInstagram, integration, refetchIntegrations]);

  return {
    integration,
    isConnected,
    isConnecting,
    isLoading: isLoadingIntegrations,
    fbError,
    connect,
    disconnect,
    refetch: refetchIntegrations,
  };
}
