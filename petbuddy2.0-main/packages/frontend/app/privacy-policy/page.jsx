"use client";

import { Card } from "@/shared/components/ui";
import PublicHeader from "@/shared/components/navigation/PublicHeader";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mt-2 text-gray-600">Last updated: July 21, 2025</p>
          </div>

          <Card className="p-8">
            <div className="prose prose-lg max-w-none">
              <div className="mb-8">
                <p className="text-gray-700 text-lg leading-relaxed">
                  Welcome to PetBuddy! We understand that privacy online is
                  important to users of our platform, especially when conducting
                  business. This Privacy Policy explains how we collect, use,
                  and protect your personal information. It applies to users who
                  visit without transacting business (&quot;Visitors&quot;) and
                  users who register to transact business on the platform and
                  make use of the services offered by PetBuddy (&quot;Authorized
                  Customers,&quot; collectively, &quot;Services&quot;).
                </p>
              </div>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  1. Information We Collect
                </h2>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Personally Identifiable Information (PII)
                </h3>
                <p className="text-gray-700 mb-3">
                  PII refers to any information that identifies or can be used
                  to identify, contact, or locate an individual. This includes
                  (but is not limited to):
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Name, address, phone number, and email address</li>
                  <li>
                    Financial profiles and payment details (credit card or bank
                    information)
                  </li>
                  <li>
                    Business details (nature and size of your business, services
                    used, advertising inventory, etc.)
                  </li>
                </ul>
                <p className="text-gray-700 mb-4">We may collect:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>From all Visitors: basic user profile information</li>
                  <li>
                    From Authorized Customers: names, addresses, phone numbers,
                    email addresses, business details, payment details, and
                    service usage
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Usage Data
                </h3>
                <p className="text-gray-700 mb-3">We also collect:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    Login and session information (IP addresses, ISP,
                    browser/device details)
                  </li>
                  <li>
                    Interaction data with our chatbot and platform (session
                    logs, usage frequency, navigation patterns)
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Cookies & Tracking
                </h3>
                <p className="text-gray-700 mb-3">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Remember preferences</li>
                  <li>Improve functionality and enhance security</li>
                  <li>Track user behavior for analytics</li>
                  <li>Automatically log out inactive sessions for security</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  2. How We Use Information
                </h2>
                <p className="text-gray-700 mb-3">
                  We use PII and usage data to:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    Operate and maintain the platform and chatbot services
                  </li>
                  <li>
                    Provide support, respond to inquiries, and send service
                    updates
                  </li>
                  <li>Fulfill transactions and requested services</li>
                  <li>
                    Customize the platform experience and make service
                    recommendations
                  </li>
                  <li>Analyze usage trends and improve product performance</li>
                  <li>Prevent abuse and comply with legal requirements</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  3. Sharing of Information
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>We do not sell personal data.</li>
                  <li>
                    Data may be shared with trusted third-party providers who
                    help us operate our services (e.g., payment processors,
                    cloud hosting, analytics, banks, insurance, and escrow
                    providers).
                  </li>
                  <li>
                    In some cases, Authorized Customers' PII may be shared with
                    other Authorized Customers only if required to evaluate or
                    facilitate explicitly requested transactions.
                  </li>
                  <li>
                    We may disclose PII when required by law or to protect
                    rights, safety, and compliance.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  4. Data Protection & Security
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    Sensitive data (like credit card numbers) is encrypted in
                    transit and at rest.
                  </li>
                  <li>
                    Access to PII is strictly controlled and limited to
                    authorized personnel on a need-to-know basis.
                  </li>
                  <li>
                    We conduct regular security audits and maintain safeguards
                    against tampering and unauthorized access.
                  </li>
                  <li>
                    While we use industry-standard protections, no system is
                    completely secure.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  5. Data Retention & Deletion
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    We retain PII only as long as necessary to provide services.
                  </li>
                  <li>
                    Users may request data deletion or deactivation at{" "}
                    <a
                      href="mailto:aiassistant@petbuddy.care"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      aiassistant@petbuddy.care
                    </a>
                    .
                  </li>
                  <li>
                    While some backup/archival copies may persist, functionally
                    deleted data will no longer be processed.
                  </li>
                  <li>In certain cases, retention may be required by law.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  6. User Choices & Rights
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    Visitors and Authorized Customers may opt out of receiving
                    marketing or unsolicited emails.
                  </li>
                  <li>
                    Users can correct inaccuracies in their data by emailing{" "}
                    <a
                      href="mailto:aiassistant@petbuddy.care"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      aiassistant@petbuddy.care
                    </a>
                    .
                  </li>
                  <li>
                    Data deletion requests will be honored to the extent
                    technically and legally possible.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  7. AI/ML Usage Disclosure
                </h2>
                <p className="text-gray-700">
                  We do not use any data obtained from Google Workspace APIs to
                  develop, improve, or train generalized AI or machine learning
                  models.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  8. Google API User Data and Limited Use
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    PetBuddy&apos;s use of information received from Google APIs
                    adheres to the Google API Services User Data Policy,
                    including Limited Use requirements.
                  </li>
                  <li>
                    We do not use Google user data for advertising or training
                    generalized AI models.
                  </li>
                  <li>
                    For more information, see{" "}
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Google&apos;s API Services User Data Policy
                    </a>
                    .
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  9. Facebook and Instagram Data
                </h2>
                <p className="text-gray-700 mb-3">
                  If you connect your Facebook or Instagram account with
                  PetBuddy:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>
                    We may access limited information (public profile, Page ID,
                    messages) to provide chatbot services like automated replies
                    and lead management.
                  </li>
                  <li>
                    We do not sell or use your Facebook/Instagram data for
                    advertising.
                  </li>
                  <li>
                    Permissions may be revoked at any time through your
                    Facebook/Instagram settings.
                  </li>
                  <li>
                    Refer to{" "}
                    <a
                      href="https://www.facebook.com/policy.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Facebook&apos;s Data Policy
                    </a>{" "}
                    for details.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  10. Changes to Privacy Policy
                </h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Updates will be posted on this page.</li>
                  <li>
                    If changes affect previously undisclosed PII, we will notify
                    impacted users and provide an opt-out option.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  11. Third-Party Links
                </h2>
                <p className="text-gray-700">
                  Our platform may contain links to third-party websites. We are
                  not responsible for their privacy practices and encourage you
                  to review their policies.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  📧 Contact Us
                </h2>
                <p className="text-gray-700 mb-4">
                  For privacy concerns, corrections, or deletion requests, email
                  us at:
                </p>
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
