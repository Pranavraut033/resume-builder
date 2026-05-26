"use client";

import { Dialog, Transition } from "@headlessui/react";
import { ReactNode } from "react";
import { Fragment } from "react";

import { Button, ButtonProps } from "./Button";
import { Icon } from "./Icon";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionButtonType?: ButtonProps["variant"];
  cancelLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  primaryAction,
  primaryActionLabel = "Save Changes",
  primaryActionButtonType = "primary",
  cancelLabel = "Cancel",
  size = "md",
}: ModalProps) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-lg" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${sizes[size]} border-agent-outline-variant bg-agent-surface max-h-[90vh] transform overflow-hidden overflow-y-auto rounded-lg border text-left align-middle shadow-(--shadow-agent-modal) transition-all`}
              >
                <div className="border-agent-outline-variant flex items-center justify-between border-b p-6">
                  <Dialog.Title
                    as="h2"
                    className="text-agent-on-surface text-xl font-semibold"
                  >
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-agent-on-surface-variant hover:text-agent-on-surface transition-colors"
                  >
                    <Icon name="x" size={24} />
                  </button>
                </div>

                <div className="text-agent-on-surface p-6">{children}</div>

                <div className="border-agent-outline-variant bg-agent-surface-lowest flex justify-end gap-3 border-t p-6">
                  <Button variant="secondary" onClick={onClose}>
                    {cancelLabel}
                  </Button>
                  {primaryAction && (
                    <Button
                      variant={primaryActionButtonType}
                      onClick={primaryAction}
                    >
                      {primaryActionLabel}
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
