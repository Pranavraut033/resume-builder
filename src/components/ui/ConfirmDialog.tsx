"use client";

import React from "react";

import { Modal } from "@/components/ui/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      cancelLabel={cancelLabel}
      primaryActionLabel={confirmLabel}
      primaryAction={onConfirm}
      title={title}
    >
      <div className="space-y-4">
        <p className="text-agent-on-surface-variant text-sm">{message}</p>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
