import { cn } from "@/lib/cn";

import { Button, Icon } from "../ui";

type MutationStatus = "idle" | "saving" | "saved" | "error";

type SaveButtonProps = {
  status: MutationStatus;
  isDirty: boolean;
  onClick: () => void;
  className?: string;
};

export function SaveButton({
  status,
  isDirty,
  onClick,
  className,
}: SaveButtonProps) {
  const uiState = getSaveButtonState(status, isDirty);

  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={uiState.disabled}
      icon={uiState.icon}
      className={cn(
        "w-full justify-center rounded-xl border py-2.5 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        {
          "border-agent-primary-fixed-dim bg-agent-primary-fixed/40 text-agent-primary hover:bg-agent-primary-fixed/60":
            uiState.tone === "primary",
          "border-green-500/40 bg-green-500/20 text-green-700 hover:bg-green-500/30":
            uiState.tone === "success",
          "border-red-500/40 bg-red-500/20 text-red-700 hover:bg-red-500/30":
            uiState.tone === "error",
        },
        className
      )}
    >
      {uiState.label}
    </Button>
  );
}

function getSaveButtonState(status: MutationStatus, isDirty: boolean) {
  if (status === "saving") {
    return {
      label: "Saving…",
      disabled: true,
      tone: "primary" as const,
      icon: (
        <span className="animate-spin">
          <Icon name="loader-2" />
        </span>
      ),
    };
  }

  if (status === "error") {
    return {
      label: "Retry save",
      disabled: false,
      tone: "error" as const,
      icon: <Icon name="alert-circle" />,
    };
  }

  if (isDirty) {
    return {
      label: "Save changes",
      disabled: false,
      tone: "primary" as const,
      icon: <Icon name="save" />,
    };
  }

  return {
    label: "Saved",
    disabled: true,
    tone: "success" as const,
    icon: <Icon name="check" />,
  };
}
