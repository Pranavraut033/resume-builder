import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";

import BackButton from "@/components/BackButton";
import { prisma } from "@/lib/prisma";

async function updateJob(id: number, formData: FormData) {
  "use server";

  const role = formData.get("role") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const jobDetailsJson = formData.get("jobDetailsJson") as string;
  const companyName = formData.get("companyName") as string;
  const companyIndustry = formData.get("companyIndustry") as string;
  const recruiterName = formData.get("recruiterName") as string;
  const recruiterEmail = formData.get("recruiterEmail") as string;

  // Update company if it exists
  const job = await prisma.job.findUnique({
    where: { id },
  });

  if (job?.companyId) {
    await prisma.company.update({
      where: { id: job.companyId },
      data: {
        name: companyName,
        industry: companyIndustry,
      },
    });
  }

  // Update contact if it exists
  if (job?.contactId) {
    await prisma.contact.update({
      where: { id: job.contactId },
      data: {
        recruiterName,
        contactEmail: recruiterEmail,
      },
    });
  }

  // Update job
  await prisma.job.update({
    where: { id },
    data: {
      role,
      description,
      status,
      jobDetailsJson,
    },
  });

  revalidatePath("/");
  redirect("/");
}

async function deleteJob(id: number) {
  "use server";

  await prisma.job.delete({
    where: { id },
  });

  revalidatePath("/");
  redirect("/");
}

export default async function JobPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div>
      <BackButton />
      <h1 className="mb-4 text-2xl font-bold">Edit Job</h1>
      <form action={updateJob.bind(null, id)} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium">
            Company Name
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            defaultValue={job.company?.name || ""}
            className="w-full border p-2"
          />
        </div>
        <div>
          <label
            htmlFor="companyIndustry"
            className="block text-sm font-medium"
          >
            Company Industry
          </label>
          <input
            type="text"
            id="companyIndustry"
            name="companyIndustry"
            defaultValue={job.company?.industry || ""}
            className="w-full border p-2"
          />
        </div>
        <div>
          <label htmlFor="recruiterName" className="block text-sm font-medium">
            Recruiter Name
          </label>
          <input
            type="text"
            id="recruiterName"
            name="recruiterName"
            defaultValue={job.contact?.recruiterName || ""}
            className="w-full border p-2"
          />
        </div>
        <div>
          <label htmlFor="recruiterEmail" className="block text-sm font-medium">
            Recruiter Email
          </label>
          <input
            type="email"
            id="recruiterEmail"
            name="recruiterEmail"
            defaultValue={job.contact?.contactEmail || ""}
            className="w-full border p-2"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            Role
          </label>
          <input
            type="text"
            id="role"
            name="role"
            defaultValue={job.role}
            required
            className="w-full border p-2"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Job Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={job.description}
            required
            className="h-32 w-full border p-2"
          ></textarea>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={job.status}
            required
            className="w-full border p-2"
          >
            <option value="Draft">Draft</option>
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label htmlFor="jobDetailsJson" className="block text-sm font-medium">
            Job Details (JSON)
          </label>
          <textarea
            id="jobDetailsJson"
            name="jobDetailsJson"
            defaultValue={job.jobDetailsJson || ""}
            className="h-24 w-full border p-2"
          ></textarea>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            Update Job
          </button>
          <form action={deleteJob.bind(null, id)}>
            <button
              type="submit"
              className="rounded bg-red-500 px-4 py-2 text-white"
            >
              Delete Job
            </button>
          </form>
        </div>
      </form>
    </div>
  );
}
