"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function BackButton() {
  const router = useRouter();

  return (
    <Button onClick={() => router.back()} className="mb-4">
      ← Back
    </Button>
  );
}
