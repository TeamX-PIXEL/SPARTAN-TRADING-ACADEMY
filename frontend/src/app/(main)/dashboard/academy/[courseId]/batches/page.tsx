import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import type { BatchRow } from "@/app/(main)/dashboard/academy/_components/batches-schema";
import { BatchesTable } from "@/app/(main)/dashboard/academy/_components/batches-table";
import type { ChapterRow } from "@/app/(main)/dashboard/academy/_components/chapters-columns";
import { ChaptersTable } from "@/app/(main)/dashboard/academy/_components/chapters-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function safeFetch(url: string, token?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON response from", url, text.slice(0, 200));
      return null;
    }
  } catch (err) {
    console.error("Fetch failed for", url, err);
    return null;
  }
}

function mapBatches(raw: any[]): BatchRow[] {
  return raw.map((batch: any) => {
    const startDate = new Date(batch.batch_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + batch.max_days);

    return {
      id: batch.id,
      batchId: `B-${batch.id}`,
      batchName: startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      startDate: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      endDate: endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: batch.status || "scheduled",
      participants: batch.no_participants,
      progress: batch.progress ?? { scheduled: 0, total: 0 },
      rawStartDate: batch.batch_start_date,
      maxDays: batch.max_days,
    };
  });
}

function mapChapters(raw: any[]): ChapterRow[] {
  return raw.map((chap: any) => ({
    id: `chap-${chap.id}`,
    dbId: chap.id,
    name: chap.title,
    day: chap.days_after_start,
    index: chap.chapter_index,
  }));
}

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  // Fetch all data in parallel on the server
  const [batchesRes, coursesRes, chaptersRes, templateRes] = await Promise.all([
    safeFetch(`${API_URL}/api/admin/courses/${courseId}/batches`, token),
    safeFetch(`${API_URL}/api/admin/courses`, token),
    safeFetch(`${API_URL}/api/admin/courses/${courseId}/chapters`, token),
    safeFetch(`${API_URL}/api/admin/courses/${courseId}/template`, token),
  ]);

  const batches = mapBatches(Array.isArray(batchesRes) ? batchesRes : []);

  const courses = coursesRes?.courses || coursesRes;
  let courseName = `Course ${courseId}`;
  if (Array.isArray(courses)) {
    const found = courses.find((c: any) => c.id.toString() === courseId);
    if (found) courseName = found.title;
  }

  const chapters = mapChapters(Array.isArray(chaptersRes) ? chaptersRes : []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Course Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your course catalog and organize the shared curriculum chapters.
        </p>
      </div>

      <Tabs defaultValue="batches" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <BatchesTable data={batches} courseId={courseId} courseName={courseName} template={templateRes} />
        </TabsContent>

        <TabsContent value="chapters">
          <div className="rounded-md border bg-card text-card-foreground shadow">
            <div className="p-6">
              <ChaptersTable initialData={chapters} courseId={courseId} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
