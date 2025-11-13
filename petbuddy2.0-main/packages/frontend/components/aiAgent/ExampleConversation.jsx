import { useState } from "react";
import Card from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui";
import Input from "@/shared/components/ui/inputs/Input";
import Textarea from "@/shared/components/ui/inputs/Textarea";

export default function ExampleConversation({
  examples = [],
  onSave,
  isEditing = false,
  onToggleEdit,
}) {
  const [localExamples, setLocalExamples] = useState(examples);
  const [newExample, setNewExample] = useState({ user: "", assistant: "" });

  const addExample = () => {
    if (newExample.user.trim() && newExample.assistant.trim()) {
      setLocalExamples([...localExamples, { ...newExample, id: Date.now() }]);
      setNewExample({ user: "", assistant: "" });
    }
  };

  const removeExample = (index) => {
    const updated = localExamples.filter((_, i) => i !== index);
    setLocalExamples(updated);
  };

  const updateExample = (index, field, value) => {
    const updated = [...localExamples];
    updated[index] = { ...updated[index], [field]: value };
    setLocalExamples(updated);
  };

  const handleSave = () => {
    onSave(localExamples);
    onToggleEdit();
  };

  const handleCancel = () => {
    setLocalExamples(examples);
    onToggleEdit();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Example Conversations
          </h3>
          <p className="text-sm text-gray-600">
            These examples help your AI agent understand how to respond to
            common questions
          </p>
        </div>
        <Button
          onClick={onToggleEdit}
          variant={isEditing ? "outline" : "primary"}
          size="sm"
        >
          {isEditing ? "Cancel" : "Edit Examples"}
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          {/* Add new example */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Add New Example
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Question
                </label>
                <Input
                  value={newExample.user}
                  onChange={(e) =>
                    setNewExample((prev) => ({ ...prev, user: e.target.value }))
                  }
                  placeholder="e.g., How much does a grooming cost?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Agent Response
                </label>
                <Textarea
                  value={newExample.assistant}
                  onChange={(e) =>
                    setNewExample((prev) => ({
                      ...prev,
                      assistant: e.target.value,
                    }))
                  }
                  placeholder="e.g., Our grooming services start at $35 for basic baths and go up to $85 for full grooms..."
                  rows={3}
                />
              </div>
              <Button
                onClick={addExample}
                size="sm"
                disabled={
                  !newExample.user.trim() || !newExample.assistant.trim()
                }
              >
                Add Example
              </Button>
            </div>
          </div>

          {/* Edit existing examples */}
          <div className="space-y-4">
            {localExamples.map((example, index) => (
              <div
                key={example.id || index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-700">
                    Example {index + 1}
                  </h5>
                  <Button
                    onClick={() => removeExample(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Question
                    </label>
                    <Input
                      value={example.user}
                      onChange={(e) =>
                        updateExample(index, "user", e.target.value)
                      }
                      placeholder="Customer question..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI Agent Response
                    </label>
                    <Textarea
                      value={example.assistant}
                      onChange={(e) =>
                        updateExample(index, "assistant", e.target.value)
                      }
                      placeholder="AI agent response..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save/Cancel buttons */}
          <div className="flex justify-end space-x-3">
            <Button onClick={handleCancel} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Examples</Button>
          </div>
        </div>
      ) : (
        /* Display examples in read-only mode */
        <div className="space-y-4">
          {localExamples.length > 0 ? (
            localExamples.map((example, index) => (
              <div
                key={example.id || index}
                className="bg-gray-50 rounded-lg p-4"
              >
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      Customer:
                    </div>
                    <div className="text-gray-900 bg-white p-3 rounded border">
                      {example.user}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      AI Agent Response:
                    </div>
                    <div className="text-gray-900 bg-white p-3 rounded border">
                      {example.assistant}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No example conversations yet.</p>
              <p className="text-sm">
                Add examples to help your AI agent respond better.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
