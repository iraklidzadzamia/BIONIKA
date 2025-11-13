"use client";

import { Card } from "@/shared/components/ui";
import PublicHeader from "@/shared/components/navigation/PublicHeader";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Terms of Use</h1>
            <p className="mt-2 text-gray-600">Last updated: July 21, 2025</p>
          </div>

          <Card className="p-8">
            <div className="prose prose-lg max-w-none">
              <div className="mb-8">
                <p className="text-gray-700 text-lg leading-relaxed">
                  By using PetBuddy Bot, you agree to our Terms of Use. Please
                  review them carefully.
                </p>
              </div>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="text-gray-700">
                  By using our chatbot and platform, you confirm you&apos;ve
                  read, understood, and agreed to these terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  2. Permitted Use
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    You may use PetBuddy Bot for lawful business purposes only.
                  </li>
                  <li>
                    You agree not to misuse the platform, reverse engineer, or
                    interfere with its operations.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  3. Account Responsibilities
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    You are responsible for keeping your login credentials safe.
                  </li>
                  <li>
                    You must immediately notify us of any unauthorized access or
                    suspicious activity.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  4. Termination
                </h2>
                <p className="text-gray-700">
                  We may suspend or terminate your account if you violate these
                  terms or abuse the service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  5. Limitation of Liability
                </h2>
                <p className="text-gray-700">
                  PetBuddy Bot is provided &apos;as-is&apos; and we are not
                  liable for any loss or damages resulting from usage.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  6. Governing Law
                </h2>
                <p className="text-gray-700">
                  These terms are governed by the laws of your jurisdiction
                  unless otherwise specified.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  📧 Questions?
                </h2>
                <p className="text-gray-700 mb-4">Email us at:</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong>{" "}
                    <a
                      href="mailto:aiassistant@petbuddy.care"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      aiassistant@petbuddy.care
                    </a>
                  </p>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
