import { GraduationCap, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface EnrollingCourseRow {
  course_id: number;
  course_title: string;
  batch_label: string;
  batch_id: number | null;
  participants: number;
}

interface EnrollingCoursesTableProps {
  data: EnrollingCourseRow[];
}

const intFormatter = new Intl.NumberFormat("en-US");

export function EnrollingCoursesTable({ data }: EnrollingCoursesTableProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base leading-none">
          <GraduationCap className="size-4" />
          Enrolling Courses
        </CardTitle>
        <CardDescription>
          Courses that are actively taking participants for their next batch, sorted by enrollment size.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Participants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    No courses have an open enrollment right now.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.course_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium leading-tight">{row.course_title}</span>
                        <span className="text-muted-foreground text-xs">{row.batch_label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                        <Users className="size-3.5 text-muted-foreground" />
                        {intFormatter.format(row.participants)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
