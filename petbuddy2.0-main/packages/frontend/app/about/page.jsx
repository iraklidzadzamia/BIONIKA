"use client";

import { Card } from "@/shared/components/ui";
import PublicHeader from "@/shared/components/navigation/PublicHeader";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">About PetBuddy</h1>
            <p className="mt-2 text-gray-600">
              Revolutionizing pet grooming salon management
            </p>
          </div>

          <Card className="p-8">
            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Our Story
                </h2>
                <p className="text-gray-700">
                  PetBuddy was founded with a simple mission: to help pet
                  grooming salons thrive in the digital age. We understand the
                  unique challenges that salon owners face every day, from
                  managing appointments to keeping track of customer preferences
                  and business operations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Our Mission
                </h2>
                <p className="text-gray-700">
                  We&apos;re committed to providing innovative, user-friendly
                  solutions that streamline salon operations, enhance customer
                  experiences, and help grooming businesses grow. Our platform
                  combines cutting-edge technology with deep industry knowledge
                  to deliver results that matter.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  What We Do
                </h2>
                <p className="text-gray-700">
                  PetBuddy offers a comprehensive suite of tools designed
                  specifically for pet grooming salons. From appointment
                  scheduling and customer management to inventory tracking and
                  business analytics, we provide everything you need to run a
                  successful grooming business.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Our Values
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Innovation
                    </h3>
                    <p className="text-blue-700 text-sm">
                      We continuously evolve our platform to meet the changing
                      needs of modern pet grooming businesses.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Reliability
                    </h3>
                    <p className="text-green-700 text-sm">
                      Our platform is built to be stable, secure, and always
                      available when you need it most.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">
                      Customer Focus
                    </h3>
                    <p className="text-purple-700 text-sm">
                      We put our customers first, providing exceptional support
                      and listening to feedback to improve our services.
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">
                      Simplicity
                    </h3>
                    <p className="text-orange-700 text-sm">
                      We believe technology should make life easier, not more
                      complicated. Our platform is designed to be intuitive and
                      user-friendly.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Our Team
                </h2>
                <p className="text-gray-700">
                  Our team consists of passionate professionals with expertise
                  in software development, pet care industry, and business
                  operations. We work together to create solutions that truly
                  make a difference in the lives of salon owners and their
                  customers.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Contact Information
                </h2>
                <p className="text-gray-700 mb-4">
                  We&apos;d love to hear from you! Whether you have questions
                  about our platform, need support, or want to share feedback,
                  our team is here to help.
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
                    <br />
                    <strong>Phone:</strong> +1 (555) 123-4567
                    <br />
                    <strong>Address:</strong> [Your business address]
                    <br />
                    <strong>Business Hours:</strong> Monday - Friday, 9:00 AM -
                    6:00 PM EST
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
