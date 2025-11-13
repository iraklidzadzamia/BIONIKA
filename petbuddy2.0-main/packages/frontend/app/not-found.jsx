"use client";

import Link from "next/link";
import { HomeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-white">404</span>
            </div>
          </div>

          {/* Floating elements */}
          <div
            className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="absolute -top-4 -right-4 w-4 h-4 bg-pink-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.3s" }}
          ></div>
          <div
            className="absolute -bottom-2 -right-2 w-5 h-5 bg-green-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.5s" }}
          ></div>
        </div>

        {/* Main Content */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            The page you&apos;re looking for seems to have wandered off like a
            curious puppy. Don&apos;t worry, we&apos;ll help you find your way
            back!
          </p>

          {/* Error Code */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 font-mono">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
            Error 404 - Page Not Found
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 w-full justify-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
          >
            <HomeIcon className="w-5 h-5" />
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-3 w-full justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Or try these helpful pages:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/schedule"
              className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
            >
              📅 Schedule
            </Link>
            <Link
              href="/messages"
              className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
            >
              💬 Messages
            </Link>
            <Link
              href="/settings/company"
              className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>

        {/* Pet-themed decoration */}
        <div className="mt-12 flex justify-center space-x-8 opacity-20">
          <div className="text-2xl">🐕</div>
          <div className="text-2xl">🐱</div>
          <div className="text-2xl">🐾</div>
          <div className="text-2xl">🦮</div>
        </div>
      </div>
    </div>
  );
}
