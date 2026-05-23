import { Job, Company } from "@prisma/client";
import { JobStatus } from "@/types/job";
import { JobDetailsJSON } from "@/types/resume";

export type PopulatedJob = Job & { company: Company | null };
export type JobRecord = Omit<PopulatedJob, "status"> & { status: JobStatus };
export type ViewMode = "card" | "table";
export type { JobDetailsJSON };
