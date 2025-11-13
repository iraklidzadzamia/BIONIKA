"use client";

import {
  Card,
  Button,
  Input,
  EmailInput,
  Textarea,
  PhoneInput,
} from "@/shared/components/ui";
import { UserIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your personal information and account settings
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              icon={UserIcon}
              placeholder="Enter your first name"
            />
            <Input
              label="Last Name"
              icon={UserIcon}
              placeholder="Enter your last name"
            />
            <EmailInput label="Email" placeholder="your.email@example.com" />
            <PhoneInput
              label="Phone"
              placeholder="+995 555 123 456"
              defaultCountry="GE"
            />
            <div className="md:col-span-2">
              <Textarea
                label="Bio"
                placeholder="Tell us a bit about yourself..."
                rows={3}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
