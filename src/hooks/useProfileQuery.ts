import { useQuery } from "@tanstack/react-query";

import { getProfile, getProfileById } from "@/actions/profile";
import { ResumeJSON } from "@/types/resume";

export function useProfileQuery(
  profileId?: number | null,
  initialData: ResumeJSON | null = null
) {
  return useQuery<ResumeJSON | null>({
    queryKey: ["profile", profileId ?? "default"],
    queryFn: () => (profileId ? getProfileById(profileId) : getProfile()),
    initialData,
  });
}
