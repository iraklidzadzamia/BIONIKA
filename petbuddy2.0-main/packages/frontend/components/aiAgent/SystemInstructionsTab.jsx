import { Button } from "@/shared/components/ui";
import Textarea from "@/shared/components/ui/inputs/Textarea";

export default function SystemInstructionsTab({
  form,
  onChange,
  onSubmit,
  isSaving,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          System Instructions
        </h2>
        <p className="text-gray-600 mb-6">
          Define the core behavior and instructions for your AI agent.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-yellow-50 p-4 sm:p-6 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Core System Instructions
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Instructions
            </label>
            <Textarea
              rows={8}
              value={form.systemInstruction}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  systemInstruction: e.target.value,
                }))
              }
              placeholder="Enter the main system instructions for your AI agent..."
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">
              These instructions tell your AI agent how to respond to customers
              and handle various situations.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-yellow-600 hover:bg-yellow-700 w-full sm:w-auto"
          >
            {isSaving ? "Saving..." : "Save System Instructions"}
          </Button>
        </div>
      </form>
    </div>
  );
}
