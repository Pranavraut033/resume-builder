import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/actions/profile";
import { ResumeJSON } from "@/types/resume";

export function useProfileQuery(initialData: ResumeJSON | null = null) {
  return useQuery<ResumeJSON | null>({
    queryKey: ["profile"],
    queryFn: getProfile,
    initialData,
  });
}
