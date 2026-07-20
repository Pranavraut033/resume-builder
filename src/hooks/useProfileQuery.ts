import { useQuery } from "@tanstack/react-query";

import { getProfileById } from "@/actions/profile";
import { ResumeJSON } from "@/types/resume";

export function useProfileQuery(
  profileId?: number | null,
  initialData: (ResumeJSON & { label: string }) | null = null
) {
  return useQuery<(ResumeJSON & { label: string }) | null>({
    queryKey: ["profile", profileId ?? "default"],
    queryFn: () => getProfileById(profileId),
    initialData,
  });
}
