"use client";
import { useState } from "react";
import Card from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui";

export default function PromptPreviewModal({ prompt, onClose, onSelect }) {
  if (!prompt) return null;

  return (
    <div className="p-1 sm:p-2">
      {/* Header */}
      <div className="mb-4">
        <div className="text-lg sm:text-xl font-semibold text-gray-900">
          {prompt.name}
        </div>
        <p className="text-gray-600 text-sm">{prompt.description}</p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Category</h3>
            <p className="text-gray-600 capitalize">
              {prompt.category?.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Business Type
            </h3>
            <p className="text-gray-600">{prompt.businessType}</p>
          </div>
        </div>

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Role */}
        {prompt.role && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Role</h3>
            <p className="text-gray-600">{prompt.role}</p>
          </div>
        )}

        {/* System Instructions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            System Instructions
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {prompt.systemInstruction}
            </pre>
          </div>
        </div>

        {/* Conversation Examples */}
        {prompt.conversationExamples &&
          prompt.conversationExamples.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Example Conversations
              </h3>
              <div className="space-y-3">
                {prompt.conversationExamples.map((example, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Customer:
                        </div>
                        <div className="text-gray-900 bg-white p-2 rounded border text-sm">
                          {example.user}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">
                          Bot Response:
                        </div>
                        <div className="text-gray-900 bg-white p-2 rounded border text-sm">
                          {example.assistant}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

        {/* Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prompt.givenInformationRules && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Information Rules
              </h3>
              <p className="text-sm text-gray-600">
                {prompt.givenInformationRules}
              </p>
            </div>
          )}
          {prompt.informationCollectionRules && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Collection Rules
              </h3>
              <p className="text-sm text-gray-600">
                {prompt.informationCollectionRules}
              </p>
            </div>
          )}
          {prompt.customerSupportRules && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Support Rules
              </h3>
              <p className="text-sm text-gray-600">
                {prompt.customerSupportRules}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button
          onClick={() => onSelect(prompt)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Use This Prompt
        </Button>
      </div>
    </div>
  );
}

