"use client";

import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg group-hover:shadow-xl transition-all duration-300"
              aria-hidden
            />
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PetBuddy
              </span>
              <div className="text-xs text-gray-500 -mt-1">
                Professional Pet Care
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/about"
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy-policy"
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms-of-use"
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </Link>
          </nav>

          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-900">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
