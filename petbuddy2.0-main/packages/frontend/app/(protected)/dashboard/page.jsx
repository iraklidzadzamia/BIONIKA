"use client";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, Button, PageLoader } from "@/ui";
import {
  useGetAppointmentsQuery,
  useListCustomersQuery,
  useListStaffQuery,
} from "@/core/api/appointmentsApi";
import { useGetCompanyProfileQuery } from "@/core/api/companyApi";

export default function DashboardPage() {
  const router = useRouter();
  const { user, company } = useSelector((s) => s.auth);
  const [dashboardData, setDashboardData] = useState({
    todayAppointments: 0,
    totalAppointments: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    pendingBookings: 0,
    staffOnDuty: 0,
  });

  // Fetch company data
  const { data: companyData, isLoading: companyLoading } =
    useGetCompanyProfileQuery(
      { companyId: company?._id || user?.companyId },
      { skip: !company?._id && !user?.companyId }
    );

  // Fetch appointments data
  const { data: appointmentsData, isLoading: appointmentsLoading } =
    useGetAppointmentsQuery(
      {
        companyId: company?._id || user?.companyId,
        page: 1,
        size: 100,
        date: new Date().toISOString().split("T")[0], // Today's date
      },
      { skip: !company?._id && !user?.companyId }
    );

  // Fetch customers data
  const { data: customersData, isLoading: customersLoading } =
    useListCustomersQuery(
      { companyId: company?._id || user?.companyId },
      { skip: !company?._id && !user?.companyId }
    );

  // Fetch staff data
  const { data: staffData, isLoading: staffLoading } = useListStaffQuery(
    { companyId: company?._id || user?.companyId },
    { skip: !company?._id && !user?.companyId }
  );

  // Calculate dashboard metrics from real data
  useEffect(() => {
    if (appointmentsData?.items && customersData?.items && staffData?.items) {
      const today = new Date().toISOString().split("T")[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Calculate today's appointments
      const todayAppointments = appointmentsData.items.filter(
        (apt) => apt.date === today
      ).length;

      // Calculate total appointments
      const totalAppointments = appointmentsData.items.length;

      // Calculate monthly revenue (sum of confirmed appointments this month)
      const monthlyRevenue = appointmentsData.items
        .filter((apt) => {
          const aptDate = new Date(apt.date);
          return (
            aptDate.getMonth() === currentMonth &&
            aptDate.getFullYear() === currentYear &&
            apt.status === "confirmed"
          );
        })
        .reduce((sum, apt) => sum + (apt.price || 0), 0);

      // Calculate total customers
      const totalCustomers = customersData.items.length;

      // Calculate pending bookings
      const pendingBookings = appointmentsData.items.filter(
        (apt) => apt.status === "pending"
      ).length;

      // Calculate staff on duty (assuming all staff are on duty for now)
      const staffOnDuty = staffData.items.length;

      setDashboardData({
        todayAppointments,
        totalAppointments,
        monthlyRevenue,
        totalCustomers,
        pendingBookings,
        staffOnDuty,
      });
    }
  }, [appointmentsData, customersData, staffData]);

  // Get recent appointments (last 4)
  const recentAppointments =
    appointmentsData?.items?.slice(0, 4).map((apt) => ({
      id: apt._id,
      customer: apt.customer?.fullName || "Unknown Customer",
      pet: apt.pet?.name + " (" + apt.pet?.breed + ")" || "Unknown Pet",
      service: apt.service?.name || "Unknown Service",
      time: new Date(apt.date + "T" + apt.time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      status: apt.status || "pending",
    })) || [];

  const handleNewBooking = () => {
    router.push("/schedule");
  };

  const handleViewReports = () => {
    router.push("/reports");
  };

  const handleViewAllAppointments = () => {
    router.push("/appointments");
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case "schedule":
        router.push("/schedule");
        break;
      case "customers":
        router.push("/customers");
        break;
      case "staff":
        router.push("/staff");
        break;
      case "reports":
        router.push("/reports");
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Loading state
  if (
    companyLoading ||
    appointmentsLoading ||
    customersLoading ||
    staffLoading
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-luxury-50 p-6">
        <PageLoader
          type="spinner"
          size="lg"
          text="Loading dashboard data..."
          variant="primary"
          layout="centered"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-luxury-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              Welcome back, {user?.fullName || "User"}! 👋
            </h1>
            <p className="text-neutral-600 mt-1">
              Here&apos;s what&apos;s happening with{" "}
              {company?.name || companyData?.company?.name || "your business"}{" "}
              today
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleNewBooking}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Booking
            </Button>
            <Button variant="luxury" size="sm" onClick={handleViewReports}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              View Reports
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="text-center group hover:shadow-luxury transition-all duration-300"
            padding="lg"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">
              {dashboardData.todayAppointments}
            </div>
            <div className="text-sm text-neutral-600">
              Today&apos;s Appointments
            </div>
          </Card>

          <Card
            className="text-center group hover:shadow-luxury transition-all duration-300"
            padding="lg"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">
              ${dashboardData.monthlyRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-600">Monthly Revenue</div>
          </Card>

          <Card
            className="text-center group hover:shadow-luxury transition-all duration-300"
            padding="lg"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">
              {dashboardData.totalCustomers}
            </div>
            <div className="text-sm text-neutral-600">Total Customers</div>
          </Card>

          <Card
            className="text-center group hover:shadow-luxury transition-all duration-300"
            padding="lg"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-neutral-900 mb-1">
              {dashboardData.pendingBookings}
            </div>
            <div className="text-sm text-neutral-600">Pending Bookings</div>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-4 h-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  onClick={() => handleQuickAction("schedule")}
                >
                  <span className="text-2xl mr-3">📅</span>
                  <span className="font-medium">New Appointment</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start p-4 h-auto bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                  onClick={() => handleQuickAction("customers")}
                >
                  <span className="text-2xl mr-3">👤</span>
                  <span className="font-medium">Add Customer</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start p-4 h-auto bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
                  onClick={() => handleQuickAction("staff")}
                >
                  <span className="text-2xl mr-3">👥</span>
                  <span className="font-medium">Manage Staff</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start p-4 h-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                  onClick={() => handleQuickAction("reports")}
                >
                  <span className="text-2xl mr-3">📊</span>
                  <span className="font-medium">View Reports</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent Appointments */}
          <div className="lg:col-span-2">
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Recent Appointments
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewAllAppointments}
                >
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentAppointments.length > 0 ? (
                  recentAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-luxury-500 to-luxury-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">
                            {appointment.customer}
                          </div>
                          <div className="text-sm text-neutral-600">
                            {appointment.pet} • {appointment.service}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-neutral-900">
                          {appointment.time}
                        </div>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-2 text-neutral-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p>No appointments yet</p>
                    <p className="text-sm">
                      Create your first appointment to get started
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Staff Status */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Staff Status
            </h3>
            <div className="space-y-3">
              {staffData?.items && staffData.items.length > 0 ? (
                staffData.items.map((staff) => (
                  <div
                    key={staff._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {staff.fullName?.[0]}
                      </div>
                      <span className="font-medium text-neutral-900">
                        {staff.fullName}
                      </span>
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      {staff.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-neutral-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p>No staff members yet</p>
                  <p className="text-sm">Add staff members to get started</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
