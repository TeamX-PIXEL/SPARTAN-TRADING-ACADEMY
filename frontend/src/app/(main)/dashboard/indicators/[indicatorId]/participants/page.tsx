import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

import { AddIndicatorUserDialog } from "@/app/(main)/dashboard/indicators/_components/add-indicator-user-dialog";
import type { IndicatorUserRow } from "@/app/(main)/dashboard/indicators/_components/indicator-participants-schema";
import { IndicatorParticipantsTable } from "@/app/(main)/dashboard/indicators/_components/indicator-participants-table";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api-fetch";

async function getParticipants(indicatorId: string): Promise<IndicatorUserRow[]> {
  const session = await getServerSession(authOptions);
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/indicators/${indicatorId}/users`, {
      cache: "no-store",
      headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });
  } catch (error) {
    console.error("Error fetching indicator participants:", error);
    return [];
  }

  if (res.status === 401) redirect("/auth/v1/login");
  if (!res.ok) return [];

  return await res.json();
}

export default async function IndicatorParticipantsPage({ params }: { params: Promise<{ indicatorId: string }> }) {
  const { indicatorId } = await params;
  const participants = await getParticipants(indicatorId);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className="mt-1 size-8" asChild>
            <Link href="/dashboard/indicators">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to Indicators</span>
            </Link>
          </Button>

          <div className="flex flex-col">
            <h2 className="font-bold text-3xl tracking-tight">Indicator Participants</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Users who purchased indicator <span className="font-medium text-foreground">#{indicatorId}</span>
            </p>
          </div>
        </div>

        <AddIndicatorUserDialog indicatorId={indicatorId} />
      </div>

      <IndicatorParticipantsTable data={participants} />
    </div>
  );
}
