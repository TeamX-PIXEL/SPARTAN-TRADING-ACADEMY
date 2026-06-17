import { CalendarClock, GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface UpcomingSessionRow {
  schedule_id: number;
  course_id: number;
  course_title: string;
  chapter_title: string;
  session_type: string | null;
  scheduled_at: string;
  batch_label: string | null;
  join_link: string | null;
}

interface UpcomingSessionsTableProps {
  data: UpcomingSessionRow[];
  nowIso?: string;
}

const intFormatter = new Intl.NumberFormat("en-US");

function formatStartsIn(target: Date, now: Date): string {
  let diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "starting now";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  diffMs -= days * 24 * 60 * 60 * 1000;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  diffMs -= hours * 60 * 60 * 1000;
  const minutes = Math.floor(diffMs / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${intFormatter.format(days)} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${intFormatter.format(hours)} hr${hours === 1 ? "" : "s"}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${intFormatter.format(minutes)} min`);

  return `in ${parts.join(" ")}`;
}

export function UpcomingSessionsTable({ data, nowIso }: UpcomingSessionsTableProps) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const sorted = [...data].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base leading-none">
          <CalendarClock className="size-4" />
          Upcoming Sessions
        </CardTitle>
        <CardDescription>Scheduled course sessions, ordered by start time.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Chapter / Module</TableHead>
                <TableHead>Starts in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No upcoming sessions scheduled.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((row) => {
                  const target = new Date(row.scheduled_at);
                  return (
                    <TableRow key={row.schedule_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 font-medium leading-tight">
                            <GraduationCap className="size-3.5 text-muted-foreground" />
                            {row.course_title}
                          </span>
                          {row.batch_label && <span className="text-muted-foreground text-xs">{row.batch_label}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{row.chapter_title}</span>
                          {row.session_type && (
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">
                              {row.session_type}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium tabular-nums">{formatStartsIn(target, now)}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">{target.toLocaleString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
