"use client";

import { Dialog, Transition } from "@headlessui/react";
import { ReactNode } from "react";
import { Fragment } from "react";

import { Button } from "./Button";
import { Icon } from "./Icon";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saveLabel = "Save Changes",
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
          <div className="bg-opacity-50 fixed inset-0 bg-black" />
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
                className={`w-full ${sizes[size]} max-h-[90vh] transform overflow-hidden overflow-y-auto rounded-lg border border-gray-200 bg-white text-left align-middle shadow-xl transition-all dark:border-gray-700 dark:bg-gray-800`}
              >
                <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                  <Dialog.Title
                    as="h2"
                    className="text-xl font-semibold text-gray-900 dark:text-white"
                  >
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                  >
                    <Icon name="x" size={24} />
                  </button>
                </div>

                <div className="p-6">{children}</div>

                <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-700">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  {onSave && (
                    <Button variant="primary" onClick={onSave}>
                      {saveLabel}
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
