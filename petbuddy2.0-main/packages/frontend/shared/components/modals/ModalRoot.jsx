"use client";
import React, { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useDispatch, useSelector } from "react-redux";
import { closeModal } from "@/core/store/slices/uiSlice";
import dynamic from "next/dynamic";
import { RemoveScroll } from "react-remove-scroll";

// Lazy load all modal components for better performance
const BookingWizard = dynamic(() => import("./BookingWizard"), { ssr: false });
const ServiceCategoryModal = dynamic(() => import("./ServiceCategoryModal"), {
  ssr: false,
});
const ServiceItemModal = dynamic(() => import("./ServiceItemModal"), {
  ssr: false,
});
const ResourceTypeModal = dynamic(() => import("./ResourceTypeModal"), {
  ssr: false,
});
const ResourceModal = dynamic(() => import("./ResourceModal"), { ssr: false });
const PromptPreviewModal = dynamic(() => import("./PromptPreviewModal"), {
  ssr: false,
});
const AIAgentControlModal = dynamic(() => import("./AIAgentControlModal"), {
  ssr: false,
});
const StaffFormModal = dynamic(() => import("./StaffFormModal"), {
  ssr: false,
});
const StaffScheduleModal = dynamic(() => import("./StaffScheduleModal"), {
  ssr: false,
});
const LocationFormModal = dynamic(() => import("./LocationFormModal"), {
  ssr: false,
});
const PageSelectionModal = dynamic(() => import("./PageSelectionModal"), {
  ssr: false,
});
const ConfirmDialog = dynamic(() => import("./ConfirmDialog"), { ssr: false });
const AlertDialog = dynamic(() => import("./AlertDialog"), { ssr: false });
const AppointmentDetailModal = dynamic(
  () => import("./AppointmentDetailModal"),
  { ssr: false }
);

const registry = {
  BOOK_APPT: BookingWizard,
  VIEW_APPT: AppointmentDetailModal,
  SERVICE_CATEGORY_FORM: ServiceCategoryModal,
  SERVICE_ITEM_FORM: ServiceItemModal,
  RESOURCE_TYPE_FORM: ResourceTypeModal,
  RESOURCE_FORM: ResourceModal,
  PROMPT_PREVIEW: PromptPreviewModal,
  AI_AGENT_CONTROL: AIAgentControlModal,
  STAFF_FORM: StaffFormModal,
  STAFF_SCHEDULE: StaffScheduleModal,
  LOCATION_FORM: LocationFormModal,
  PAGE_SELECTION: PageSelectionModal,
  CONFIRM_DIALOG: ConfirmDialog,
  ALERT_DIALOG: AlertDialog,
};

export default function ModalRoot() {
  const dispatch = useDispatch();
  const modals = useSelector((s) => s.ui.modals);
  const shouldLockScroll = (modals || []).some(({ ui: entryUi, props }) => {
    const u = entryUi || props?.ui || {};
    return u.allowBackgroundInteraction !== true;
  });
  // Lightweight bridge: allow components to open an Alert via window event
  useEffect(() => {
    const handler = (e) => {
      const message =
        typeof e.detail === "string" ? e.detail : String(e.detail || "");
      // Open alert dialog
      const event = new CustomEvent("pb:dispatch", {
        detail: {
          id: "ALERT_DIALOG",
          props: { message },
          ui: { title: "Notice", showClose: true, size: "sm", align: "top" },
        },
      });
      window.dispatchEvent(event);
    };
    window.addEventListener("pb:openAlert", handler);
    return () => window.removeEventListener("pb:openAlert", handler);
  }, []);

  return (
    <>
      <RemoveScroll
        enabled={shouldLockScroll}
        removeScrollBar={true}
        allowPinchZoom={true}
      >
        {modals.map(({ id, props, ui: entryUi }, idx) => {
          const Comp = registry[id];
          if (!Comp) return null;
          const ui = entryUi || props?.ui || {};
          const {
            title,
            showClose = false,
            size,
            align = "center",
            preventOutsideClose: uiPreventOutsideClose = false,
            className = "",
            description,
            compact: uiCompact,
            mobileFullscreen: uiMobileFullscreen,
            // New optional UI controls
            backdropBlur = true,
            closeOnOutsideClick = true,
            showBackdrop = true,
            horizontal = "center",
            fullHeight = false,
            allowBackgroundInteraction = false,
          } = ui;

          const isCompact =
            uiCompact === true ||
            id === "ALERT_DIALOG" ||
            id === "CONFIRM_DIALOG";
          const mobileFullscreen =
            uiMobileFullscreen !== undefined ? uiMobileFullscreen : !isCompact;
          const resolvedSize =
            size ||
            (id === "ALERT_DIALOG" || id === "CONFIRM_DIALOG" ? "sm" : "4xl");

          const sizeClass = (() => {
            switch (resolvedSize) {
              case "sm":
                return "max-w-sm";
              case "md":
                return "max-w-md";
              case "lg":
                return "max-w-lg";
              case "xl":
                return "max-w-xl";
              case "2xl":
                return "max-w-2xl";
              case "3xl":
                return "max-w-3xl";
              case "4xl":
                return "max-w-4xl";
              case "5xl":
                return "max-w-5xl";
              case "full":
                return "max-w-[95vw] h-[95vh]";
              default:
                return "max-w-4xl";
            }
          })();

          const verticalAlignClass =
            align === "top" ? "items-start sm:items-start" : "items-center";

          const horizontalJustifyClass = (() => {
            switch (horizontal) {
              case "left":
                return "justify-start";
              case "right":
                return "justify-end";
              default:
                return "justify-center";
            }
          })();

          const effectivePreventOutsideClose =
            uiPreventOutsideClose || closeOnOutsideClick === false;

          const onCloseHandler = () => {
            if (effectivePreventOutsideClose) return;
            dispatch(closeModal({ id }));
          };
          return (
            <Transition key={idx} appear show as={Fragment}>
              <Dialog
                as="div"
                className="relative z-50"
                onClose={onCloseHandler}
              >
                {showBackdrop && (
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <div
                      className={`fixed inset-0 bg-slate-900/40 ${
                        backdropBlur ? "backdrop-blur-sm" : ""
                      }`}
                    />
                  </Transition.Child>
                )}

                <div
                  className={`fixed inset-0 overscroll-contain ${
                    allowBackgroundInteraction ? "pointer-events-none" : ""
                  }`}
                >
                  <div
                    className={`flex min-h-full ${verticalAlignClass} ${horizontalJustifyClass} ${
                      fullHeight && horizontal !== "center" ? "p-0" : "p-4"
                    }`}
                  >
                    <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-200"
                      enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                      enterTo="opacity-100 translate-y-0 sm:scale-100"
                      leave="ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                      leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                      <Dialog.Panel
                        className={`pointer-events-auto w-full ${sizeClass} bg-white shadow-2xl ring-1 ring-black/5 ${
                          fullHeight
                            ? "h-[100dvh] sm:h-[100dvh] rounded-none sm:rounded-none"
                            : mobileFullscreen
                            ? "h-[100dvh] sm:max-h-[95vh] rounded-none sm:rounded-2xl"
                            : "max-h-[95vh] sm:rounded-2xl"
                        } flex flex-col min-h-0 overflow-hidden ${className} pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
                      >
                        <div className="flex flex-col min-h-0">
                          {(title || showClose) && (
                            <div
                              className={`sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 ${
                                backdropBlur
                                  ? "bg-white/80 backdrop-blur"
                                  : "bg-white"
                              } ${isCompact ? "px-3 py-2" : "px-4 py-3"}`}
                            >
                              <div className="min-w-0">
                                <Dialog.Title
                                  className={`font-semibold text-gray-900 truncate ${
                                    isCompact
                                      ? "text-sm sm:text-base"
                                      : "text-base sm:text-lg"
                                  }`}
                                >
                                  {title || ""}
                                </Dialog.Title>
                                {description && (
                                  <Dialog.Description
                                    className={`mt-0.5 text-gray-600 truncate ${
                                      isCompact
                                        ? "text-xs"
                                        : "text-xs sm:text-sm"
                                    }`}
                                  >
                                    {description}
                                  </Dialog.Description>
                                )}
                              </div>
                              {showClose && (
                                <button
                                  type="button"
                                  onClick={() => dispatch(closeModal({ id }))}
                                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                                  aria-label="Close"
                                >
                                  <svg
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                          <div
                            className={`flex-1 overflow-y-auto ${
                              isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"
                            } min-h-0`}
                          >
                            <Comp
                              {...props}
                              onClose={() => dispatch(closeModal({ id }))}
                            />
                          </div>
                        </div>
                      </Dialog.Panel>
                    </Transition.Child>
                  </div>
                </div>
              </Dialog>
            </Transition>
          );
        })}
      </RemoveScroll>
    </>
  );
}
