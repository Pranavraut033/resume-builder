import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/actions/profile";
import { ResumeJSON } from "@/types/resume";

export function useProfile(shouldInitializeData = false) {
  return useQuery<ResumeJSON | null>({
    queryKey: ["profile"],
    queryFn: getProfile,
    initialData: shouldInitializeData
      ? ({
          header: {
            name: "",
            email: "",
            phone: null,
            location: null,
            linkedin: null,
            github: null,
            website: null,
          },
          summary: "",
          experience: [],
          projects: [],
          skills: [],
          education: [],
          certifications: [],
          publications: [],
          languages: [],
          volunteer: [],
          awards: [],
        } satisfies ResumeJSON)
      : null,
  });
}
