"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { createLogger } from "@/lib/logger";
import { ResumeJSON } from "@/types/resume";

const logger = createLogger("ImportJsonModal");

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (profile: ResumeJSON) => void;
}

export function ImportJsonModal({
  isOpen,
  onClose,
  onImport,
}: ImportJsonModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [importingJson, setImportingJson] = useState(false);
  const { pushToast } = useToast();

  const handleImport = async () => {
    if (!jsonText.trim()) {
      pushToast({
        title: "JSON required",
        description: "Please paste your profile JSON.",
        variant: "error",
      });
      return;
    }

    setImportingJson(true);
    try {
      const parsed = JSON.parse(jsonText) as ResumeJSON;
      onImport(parsed);
      onClose();
      setJsonText("");
      pushToast({
        title: "Profile imported",
        description: "Review and save your profile.",
        variant: "success",
      });
    } catch (error) {
      logger.error("Error parsing JSON", { error });
      pushToast({
        title: "Import failed",
        description:
          "Error parsing JSON. Please make sure the format is valid profile JSON.",
        variant: "error",
      });
    } finally {
      setImportingJson(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Profile from JSON">
      <div className="space-y-4">
        <p className="text-agent-on-surface-variant text-sm">
          Paste your profile JSON below to import it. This will replace your
          current profile.
        </p>

        <div>
          <label htmlFor="jsonText" className="mb-2 block text-sm font-medium">
            Profile JSON
          </label>
          <textarea
            id="jsonText"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="h-96 w-full rounded border p-3 font-mono text-sm"
            placeholder="Paste your profile JSON here..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={importingJson}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={importingJson || !jsonText.trim()}
          >
            {importingJson ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
