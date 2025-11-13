import { Button } from "@/shared/components/ui";
import Textarea from "@/shared/components/ui/inputs/Textarea";

export default function AIRulesTab({ form, onChange, onSubmit, isSaving }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          AI Agent Rules & Behavior
        </h2>
        <p className="text-gray-600 mb-6">
          Define how your AI agent should behave and what rules it should
          follow.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            AI Agent Role & Behavior
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Agent Role
              </label>
              <Textarea
                rows={3}
                value={form.role}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                placeholder="Define the primary role of your AI agent (e.g., Customer Service Representative, Appointment Scheduler, etc.)"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Information Rules
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Given Information Rules
                </label>
                <Textarea
                  rows={4}
                  value={form.givenInformationRules}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      givenInformationRules: e.target.value,
                    }))
                  }
                  placeholder="Rules for what information the AI agent can share with customers (e.g., pricing, services, policies)"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Information Collection Rules
                </label>
                <Textarea
                  rows={4}
                  value={form.informationCollectionRules}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      informationCollectionRules: e.target.value,
                    }))
                  }
                  placeholder="Rules for what customer information the AI agent can collect (e.g., contact details, preferences)"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 sm:p-6 rounded-lg border border-purple-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Customer Support Rules
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Support Guidelines
              </label>
              <Textarea
                rows={4}
                value={form.customerSupportRules}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    customerSupportRules: e.target.value,
                  }))
                }
                placeholder="Guidelines for how the AI agent should handle customer support, complaints, and escalations"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            {isSaving ? "Saving..." : "Save AI Agent Rules"}
          </Button>
        </div>
      </form>
    </div>
  );
}
