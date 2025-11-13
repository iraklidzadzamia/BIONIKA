import ExampleConversation from "@/components/aiAgent/ExampleConversation";

export default function ExamplesTab({
  examples,
  onSave,
  isEditing,
  onToggleEdit,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Message Examples
        </h2>
        <p className="text-gray-600 mb-6">
          Add example conversations to help your AI agent learn from previous
          interactions.
        </p>
      </div>

      <ExampleConversation
        examples={examples}
        onSave={onSave}
        isEditing={isEditing}
        onToggleEdit={onToggleEdit}
      />
    </div>
  );
}
