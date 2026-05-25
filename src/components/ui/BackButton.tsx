"use client";

import { useRouter } from "next/navigation";

import { Button, Icon } from "@/components/ui";

export default function BackButton() {
  const router = useRouter();

  return (
    <Button onClick={() => router.back()}>
      <Icon name="arrowLeft" /> Back
    </Button>
  );
}
