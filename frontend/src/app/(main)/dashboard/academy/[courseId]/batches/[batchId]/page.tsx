import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

import type { ScheduleRow } from "@/app/(main)/dashboard/academy/_components/schedule-columns";
import { ScheduleTable } from "@/app/(main)/dashboard/academy/_components/schedule-table";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-fetch";

async function getSchedulesForBatch(batchId: string): Promise<ScheduleRow[]> {
  const session = await getServerSession(authOptions);
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/batches/${batchId}/schedules`, {
      cache: "no-store",
      headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }

  if (res.status === 401) redirect("/auth/v1/login");
  if (!res.ok) return [];

  const backendData = await res.json();
  return backendData.map((sched: any) => ({
    ...sched,
    rawScheduledAt: sched.scheduledAt,
  }));
}

async function getChaptersForCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/api/admin/courses/${courseId}/chapters`, {
      cache: "no-store",
      headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return [];
  }

  if (res.status === 401) redirect("/auth/v1/login");
  if (!res.ok) return [];

  return await res.json();
}

export default async function BatchSchedulePage({
  params,
}: {
  params: Promise<{ courseId: string; batchId: string }>;
}) {
  const { courseId, batchId } = await params;

  // Fetch real data simultaneously
  const realScheduleData = await getSchedulesForBatch(batchId);
  const courseChapters = await getChaptersForCourse(courseId);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start gap-4">
        <Button variant="outline" size="icon" className="size-8 mt-1" asChild>
          <Link href={`/dashboard/academy/${courseId}/batches`}>
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to Batches</span>
          </Link>
        </Button>

        <div className="flex flex-col">
          <h2 className="text-3xl font-bold tracking-tight">Batch Schedule</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Managing modules and classes for batch: <span className="font-medium text-foreground">{batchId}</span>
          </p>
        </div>
      </div>

      <ScheduleTable
        data={realScheduleData}
        batchName={batchId}
        batchId={batchId}
        courseId={courseId}
        chapters={courseChapters} // Pass the fetched chapters down!
      />
    </div>
  );
}
