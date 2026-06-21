"use client";

import * as React from "react";

import { GraduationCap, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAcademyStore,
} from "@/lib/academy-store";

import { CourseFormDialog } from "./course-form-dialog";
import { CompletedCoursesTable } from "./completed-courses-table";
import { OngoingCoursesTable } from "./ongoing-courses-table";
import { UpcomingCoursesTable } from "./upcoming-courses-table";
import { EnrolledMembersView } from "./enrolled-members-view";
import { LessonsManageView } from "./lessons-manage-view";

export function AcademyView() {
  const courses = useAcademyStore((s) => s.courses);
  const view = useAcademyStore((s) => s.view);
  const fetchCourses = useAcademyStore((s) => s.fetchCourses);
  const [tab, setTab] = React.useState<"upcoming" | "ongoing" | "completed">("upcoming");
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const upcoming = courses.filter((c) => c.status === "upcoming");
  const ongoing = courses.filter((c) => c.status === "ongoing");
  const completed = courses.filter((c) => c.status === "completed");

  if (view.name === "enrolled-members") {
    const course = courses.find((c) => c.id === view.courseId);
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
        <EnrolledMembersView course={course} />
      </div>
    );
  }

  if (view.name === "lessons-manage") {
    const course = courses.find((c) => c.id === view.courseId);
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
        <LessonsManageView course={course} />
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <GraduationCap className="size-7 text-primary" />
            Academy Courses
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your course catalog across upcoming, on-going and completed cohorts. Create a course,
            then launch lessons and onboard members.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-1.5">
            Upcoming
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {upcoming.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="ongoing" className="gap-1.5">
            On-Going
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {ongoing.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            Completed
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {completed.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
              <div className="flex flex-col space-y-1 overflow-hidden">
                <CardTitle className="truncate">Upcoming Courses</CardTitle>
                <CardDescription className="hidden truncate sm:block">
                  Courses scheduled to launch. Edit details, manage enrollments or remove a course no one
                  has bought yet.
                </CardDescription>
              </div>
              <Button className="shrink-0 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New Course
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <UpcomingCoursesTable courses={upcoming} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ongoing" className="mt-4">
          <Card className="w-full">
            <CardHeader className="pb-0">
              <CardTitle>On-Going Courses</CardTitle>
              <CardDescription>
                Active cohorts. Launch YouTube videos and live Google Meet / Zoom sessions from the lesson
                manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <OngoingCoursesTable courses={ongoing} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <Card className="w-full">
            <CardHeader className="pb-0">
              <CardTitle>Completed Courses</CardTitle>
              <CardDescription>
                Finished cohorts. Review course details and manage members &amp; Discord support.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <CompletedCoursesTable courses={completed} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CourseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
