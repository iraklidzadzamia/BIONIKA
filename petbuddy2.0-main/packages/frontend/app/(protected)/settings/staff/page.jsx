"use client";

import { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { setSelectedLocation } from "@/core/store/slices/authSlice";
import { openModal, closeModal } from "@/core/store/slices/uiSlice";
import {
  Button,
  Card,
  Input,
  Select,
  ContentLoader,
} from "@/shared/components/ui";
import {
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} from "@/core/api/baseApi";
import { useListLocationsQuery } from "@/core/api/locationsApi";
import { useListServicesQuery } from "@/core/api/appointmentsApi";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { STAFF_ROLE_OPTIONS } from "@/shared/constants/roles";

export default function StaffSettingsPage() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const { user } = useSelector((s) => s.auth);
  const isManager = user?.role === "manager";

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const { data, isLoading, error } = useGetStaffQuery(
    {
      q: search || undefined,
      role: role || undefined,
      // locationId appended after selector is available
    },
    { refetchOnMountOrArgChange: true }
  );
  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [deleteStaff, { isLoading: isDeleting }] = useDeleteStaffMutation();

  const staff = useMemo(() => data?.items || [], [data]);

  const onAddClick = () => {
    dispatch(
      openModal({
        id: "STAFF_FORM",
        props: {
          initial: null,
          isManager,
          saving: isCreating || isUpdating,
          onSave: async (form) => {
            try {
              await createStaff(form).unwrap();
              // Close the modal after successful save
              dispatch(closeModal({ id: "STAFF_FORM" }));
            } catch (e) {
              console.error(e);
              dispatch(
                openModal({
                  id: "ALERT_DIALOG",
                  props: { message: "Failed to save" },
                  ui: {
                    title: "Error",
                    showClose: true,
                    size: "sm",
                    align: "top",
                  },
                })
              );
            }
          },
        },
        ui: {
          title: "Add staff",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  const onEditClick = (member) => {
    dispatch(
      openModal({
        id: "STAFF_FORM",
        props: {
          initial: member,
          isManager,
          saving: isCreating || isUpdating,
          onSave: async (form) => {
            try {
              await updateStaff({ id: member._id, ...form }).unwrap();
              // Close the modal after successful save
              dispatch(closeModal({ id: "STAFF_FORM" }));
            } catch (e) {
              console.error(e);
              dispatch(
                openModal({
                  id: "ALERT_DIALOG",
                  props: { message: "Failed to save" },
                  ui: {
                    title: "Error",
                    showClose: true,
                    size: "sm",
                    align: "top",
                  },
                })
              );
            }
          },
        },
        ui: {
          title: "Edit staff",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  const onDelete = async (id) => {
    if (!isManager) return;
    dispatch(
      openModal({
        id: "CONFIRM_DIALOG",
        props: {
          message: "Delete this staff member? This action cannot be undone.",
          confirmText: "Delete",
          cancelText: "Cancel",
          onConfirm: async () => {
            try {
              await deleteStaff({ id }).unwrap();
            } catch (e) {
              console.error(e);
              dispatch(
                openModal({
                  id: "ALERT_DIALOG",
                  props: { message: "Failed to delete" },
                  ui: {
                    title: "Error",
                    showClose: true,
                    size: "sm",
                    align: "top",
                  },
                })
              );
            }
          },
        },
        ui: {
          title: "Confirm Delete",
          showClose: true,
          size: "sm",
          align: "top",
        },
      })
    );
  };

  const { data: locRes } = useListLocationsQuery();
  const locations = useMemo(() => locRes?.items || [], [locRes]);
  const selectedLocationId =
    useSelector((s) => s.auth.selectedLocationId) || "";
  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      const main = locations.find((l) => l.isMain) || locations[0];
      if (main?._id) dispatch(setSelectedLocation(main._id));
    }
  }, [locations, selectedLocationId, dispatch]);

  // Auto-open add staff modal if query parameter is present
  useEffect(() => {
    const shouldAddStaff = searchParams.get("addStaff");
    if (shouldAddStaff === "true" && isManager) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        onAddClick();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isManager]);

  // Refetch staff when location changes (using same endpoint with args)
  // Simpler approach: rely on parent list filter bar; we already filter in backend via query param elsewhere

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Staff</h1>
        {isManager && (
          <Button onClick={onAddClick} size="sm">
            <PlusIcon className="h-5 w-5 mr-2" /> Add
          </Button>
        )}
      </div>

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-52">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              {STAFF_ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-60">
            <Select
              value={selectedLocationId}
              onChange={(e) => dispatch(setSelectedLocation(e.target.value))}
            >
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card padding="sm">
          <ContentLoader
            type="table-skeleton"
            layout="centered"
            padding="lg"
            fullWidth
          />
        </Card>
      ) : error ? (
        <Card padding="sm">
          <div className="py-8 text-center text-sm text-red-600">
            Failed to load staff
          </div>
        </Card>
      ) : staff.length === 0 ? (
        <Card padding="sm">
          <div className="py-8 text-center text-sm text-gray-500">
            No staff yet
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((m) => (
            <Card
              key={m._id}
              padding="sm"
              className="flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">
                  {m.fullName || "Unnamed"}
                </div>
                <div className="text-sm text-gray-600 truncate">{m.email}</div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                  <span className="capitalize">
                    {m.roles && m.roles.length > 0
                      ? m.roles.map(role => STAFF_ROLE_OPTIONS.find(opt => opt.value === role)?.label || role).join(', ')
                      : m.role || 'No role'}
                  </span>
                  {m.phone ? <span>• {m.phone}</span> : null}
                </div>
                {m.serviceCategoryIds && m.serviceCategoryIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <StaffCategories categoryIds={m.serviceCategoryIds} />
                  </div>
                )}
              </div>
              {isManager && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditClick(m)}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Button>
                  <ScheduleButton staff={m} />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(m._id)}
                    disabled={isDeleting}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Staff form handled via ModalRoot */}
    </div>
  );
}

function StaffCategories({ categoryIds }) {
  const { data: servicesRes } = useListServicesQuery();
  const serviceCategories = servicesRes?.items || [];

  if (!categoryIds || categoryIds.length === 0) {
    return (
      <span className="text-xs text-gray-400 italic">
        Can perform all services
      </span>
    );
  }

  const categories = categoryIds
    .map((id) => serviceCategories.find((cat) => cat._id === id))
    .filter(Boolean);

  if (categories.length === 0) return null;

  return (
    <>
      {categories.map((cat) => (
        <span
          key={cat._id}
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-700"
          style={
            cat.color
              ? { backgroundColor: cat.color + "20", color: cat.color }
              : {}
          }
        >
          {cat.name}
        </span>
      ))}
    </>
  );
}

function ScheduleButton({ staff }) {
  const dispatch = useDispatch();
  const staffName = staff?.fullName || staff?.email || "Staff";
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() =>
        dispatch(
          openModal({
            id: "STAFF_SCHEDULE",
            props: { staff },
            ui: {
              title: `Schedule — ${staffName}`,
              showClose: true,
              size: "3xl",
              align: "top",
            },
          })
        )
      }
      title="Manage schedule"
    >
      Schedule
    </Button>
  );
}
