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
import { BatchFormDialog } from "./batch-form-dialog";
import { CoursesCatalogTable } from "./courses-catalog-table";
import { CourseLessonsView } from "./course-lessons-view";
import { CompletedCoursesTable } from "./completed-courses-table";
import { OngoingCoursesTable } from "./ongoing-courses-table";
import { UpcomingCoursesTable } from "./upcoming-courses-table";
import { EnrolledMembersView } from "./enrolled-members-view";
import { LessonsManageView } from "./lessons-manage-view";

export function AcademyView() {
  const courses = useAcademyStore((s) => s.courses);
  const view = useAcademyStore((s) => s.view);
  const fetchCourses = useAcademyStore((s) => s.fetchCourses);
  const [mainTab, setMainTab] = React.useState<"courses" | "batches">("courses");
  const [batchTab, setBatchTab] = React.useState<"upcoming" | "ongoing" | "completed">("upcoming");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [batchCreateOpen, setBatchCreateOpen] = React.useState(false);

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

  if (view.name === "course-lessons") {
    const course = courses.find((c) => c.id === view.courseId);
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
        <CourseLessonsView course={course} />
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <GraduationCap className="size-7 text-primary" />
            Academy
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your course catalog and schedule batches. Create a course first, then register batches to launch lessons and onboard members.
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
        <TabsList>
          <TabsTrigger value="courses" className="gap-1.5">
            Courses
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {courses.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="batches" className="gap-1.5">
            Batches
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {upcoming.length + ongoing.length + completed.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COURSES TAB — Product catalog (all courses)                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="courses" className="mt-4">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
              <div className="flex flex-col space-y-1 overflow-hidden">
                <CardTitle className="truncate">Course Catalog</CardTitle>
                <CardDescription className="hidden truncate sm:block">
                  All courses you have created. Publish a course, then register batches to schedule live cohorts.
                </CardDescription>
              </div>
              <Button className="shrink-0 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New Course
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <CoursesCatalogTable courses={courses} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BATCHES TAB — Scheduled cohorts (upcoming / ongoing / completed)  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="batches" className="mt-4">
          <Tabs value={batchTab} onValueChange={(v) => setBatchTab(v as typeof batchTab)}>
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
                    <CardTitle className="truncate">Upcoming Batches</CardTitle>
                    <CardDescription className="hidden truncate sm:block">
                      Scheduled cohorts waiting to launch. Edit details, manage enrollments or remove a batch no one has bought yet.
                    </CardDescription>
                  </div>
                  <Button className="shrink-0 gap-1.5" onClick={() => setBatchCreateOpen(true)}>
                    <Plus className="size-4" />
                    New Batch
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
                  <CardTitle>On-Going Batches</CardTitle>
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
                  <CardTitle>Completed Batches</CardTitle>
                  <CardDescription>
                    Finished cohorts. Review batch details and manage members &amp; Discord support.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <CompletedCoursesTable courses={completed} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <CourseFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <BatchFormDialog open={batchCreateOpen} onOpenChange={setBatchCreateOpen} />
    </div>
  );
}
