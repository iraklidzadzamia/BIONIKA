"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  HomeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { Menu, Transition, Dialog } from "@headlessui/react";
import clsx from "clsx";
import { IconButton } from "@/shared/components/ui";

function AvatarCircle({ label, size = 8, className = "" }) {
  const initial = (label || "?").trim().charAt(0).toUpperCase();
  const sizeClass =
    size === 6 ? "h-6 w-6" : size === 10 ? "h-10 w-10" : "h-8 w-8";
  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold shadow-lg",
        sizeClass,
        className
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Schedule", href: "/schedule", icon: CalendarDaysIcon },
  { name: "Messages", href: "/messages", icon: ChatBubbleLeftRightIcon },
];

function Brand() {
  return (
    <Link href="/schedule" className="flex items-center gap-3 group">
      <div
        className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg group-hover:shadow-xl transition-all duration-300"
        aria-hidden
      />
      <div className="hidden sm:block">
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          PetBuddy
        </span>
        <div className="text-xs text-gray-500 -mt-1">Professional Pet Care</div>
      </div>
    </Link>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, company } = useSelector((s) => s.auth);
  const { logout, isLoggingOut } = useAuth();

  // Navigation items defined at module scope (NAV_ITEMS)

  const onLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Logout failed, error handled by logout function
    }
  };

  // Use Redux company data as fallback
  const companyName = company?.name || user?.companyName || "Company";
  const userName = user?.fullName || "User";

  return (
    <header className="sticky top-0 z-40 bg-white/90 supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-md border-b border-gray-100/60 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Mobile menu button + brand */}
          <div className="flex items-center gap-3">
            <IconButton
              variant="ghost"
              size="md"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </IconButton>

            {/* Brand */}
            <Brand />
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname && pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-indigo-700 bg-indigo-50"
                      : "text-gray-600 hover:text-indigo-700 hover:bg-gray-50"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: notifications + company dropdown + user menu */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <IconButton
              variant="ghost"
              size="md"
              className="hidden sm:flex relative"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
            </IconButton>

            {/* Company dropdown for managers */}
            {user?.role === "manager" && (
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
                    <AvatarCircle label={companyName} size={6} />
                    <div className="text-left">
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[8rem]">
                        {companyName}
                      </div>
                      <div className="text-xs text-gray-500">Company</div>
                    </div>
                  </Menu.Button>
                </div>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl border border-gray-200 bg-white p-2 shadow-xl focus:outline-none">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </div>

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/settings/company"
                          className={clsx(
                            "block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          Company Profile
                        </Link>
                      )}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/settings/ai-agent"
                          className={clsx(
                            "block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          AI Agent Settings
                        </Link>
                      )}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/settings/staff"
                          className={clsx(
                            "block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          Staff Accounts
                        </Link>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            {/* User menu */}
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
                  <AvatarCircle label={userName} size={6} />
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[8rem]">
                      {userName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {user?.role}
                    </div>
                  </div>
                </Menu.Button>
              </div>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl border border-gray-200 bg-white p-2 shadow-xl focus:outline-none">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </div>

                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/profile"
                        className={clsx(
                          "block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
                          active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        User Profile
                      </Link>
                    )}
                  </Menu.Item>

                  <div className="my-2 h-px bg-gray-200" />

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={onLogout}
                        disabled={isLoggingOut}
                        className={clsx(
                          "w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150",
                          active
                            ? "bg-red-50 text-red-700"
                            : "text-red-600 hover:bg-red-50",
                          isLoggingOut && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isLoggingOut ? "Signing out..." : "Sign out"}
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Transition show={mobileOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setMobileOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-250"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-sm bg-white shadow-2xl h-full overflow-y-auto">
                    {/* Mobile menu header */}
                    <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg"
                          aria-hidden
                        />
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          PetBuddy
                        </span>
                      </div>
                      <button
                        className="inline-flex items-center justify-center rounded-xl p-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Mobile menu content */}
                    <div className="px-6 py-6">
                      {/* User info */}
                      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 mb-6">
                        <AvatarCircle label={companyName} size={8} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {companyName}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            <span className="capitalize">{user?.role}</span>
                          </div>
                        </div>
                      </div>

                      {/* Navigation */}
                      <nav className="space-y-2 mb-8">
                        {NAV_ITEMS.map((item) => {
                          const isActive =
                            pathname && pathname.startsWith(item.href);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={clsx(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                                isActive
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "text-gray-700 hover:bg-gray-50 hover:text-indigo-700"
                              )}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <Icon className="h-5 w-5" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </nav>

                      {/* User Profile */}
                      <div className="space-y-2 mb-6">
                        <div className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profile
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-base text-gray-700 hover:bg-gray-50 hover:text-indigo-700 transition-all duration-200"
                        >
                          <UserIcon className="h-5 w-5" />
                          <span>User Profile</span>
                        </Link>
                      </div>

                      {/* Company Settings section */}
                      {user?.role === "manager" && (
                        <div className="space-y-2 mb-8">
                          <div className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </div>
                          <Link
                            href="/settings/company"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base text-gray-700 hover:bg-gray-50 hover:text-indigo-700 transition-all duration-200"
                          >
                            <BuildingOffice2Icon className="h-5 w-5" />
                            <span>Company Profile</span>
                          </Link>
                          <Link
                            href="/settings/ai-agent"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base text-gray-700 hover:bg-gray-50 hover:text-indigo-700 transition-all duration-200"
                          >
                            <ChatBubbleLeftRightIcon className="h-5 w-5" />
                            <span>AI Agent Settings</span>
                          </Link>

                          <Link
                            href="/settings/staff"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base text-gray-700 hover:bg-gray-50 hover:text-indigo-700 transition-all duration-200"
                          >
                            <UserIcon className="h-5 w-5" />
                            <span>Staff Accounts</span>
                          </Link>
                        </div>
                      )}

                      {/* Logout button */}
                      <button
                        onClick={onLogout}
                        disabled={isLoggingOut}
                        className="w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-base font-medium text-white shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoggingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </header>
  );
}
