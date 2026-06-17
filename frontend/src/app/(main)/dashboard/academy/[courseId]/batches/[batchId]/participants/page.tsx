import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

import { AddParticipantDialog } from "@/app/(main)/dashboard/academy/_components/add-participant-dialog";
import type { ParticipantRow } from "@/app/(main)/dashboard/academy/_components/participants-schema";
import { ParticipantsTable } from "@/app/(main)/dashboard/academy/_components/participants-table";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-fetch";

async function getParticipants(batchId: string): Promise<ParticipantRow[]> {
  const session = await getServerSession(authOptions);
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/batches/${batchId}/participants`, {
      cache: "no-store",
      headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return [];
  }

  if (res.status === 401) redirect("/auth/v1/login");
  if (!res.ok) return [];

  return await res.json();
}

export default async function BatchParticipantsPage({
  params,
}: {
  params: Promise<{ courseId: string; batchId: string }>;
}) {
  const { courseId, batchId } = await params;
  const participants = await getParticipants(batchId);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className="mt-1 size-8" asChild>
            <Link href={`/dashboard/academy/${courseId}/batches`}>
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to Batches</span>
            </Link>
          </Button>

          <div className="flex flex-col">
            <h2 className="font-bold text-3xl tracking-tight">Batch Participants</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Viewing all participants enrolled in batch: <span className="font-medium text-foreground">{batchId}</span>
            </p>
          </div>
        </div>

        <AddParticipantDialog batchId={batchId} />
      </div>

      <ParticipantsTable data={participants} batchName={batchId} batchId={batchId} />
    </div>
  );
}
