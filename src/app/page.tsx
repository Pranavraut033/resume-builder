import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import JobTableClient from './components/JobTableClient';
import { Button } from '@/components/ui/Button';

export default async function Home() {
  const jobList = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      company: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-blocky text-blocky-900">Job Dashboard</h1>
        <Link href="/job/new" aria-label="Add new job">
          <Button variant="blocky">Add New Job</Button>
        </Link>
      </div>

      <JobTableClient jobs={jobList} />
    </div>
  );
}