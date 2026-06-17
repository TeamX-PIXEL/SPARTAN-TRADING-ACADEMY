import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { AcademyTable } from "./_components/courses-table";
import { AcademyFilters } from "./_components/academy-filters";

export default async function AcademyDashboardPage() {
  return (
    <div className="w-full min-w-0 flex flex-col gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Academy Courses</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your course catalog and select a course to view its active batches.
        </p>
      </div>

      <AcademyFilters />
      <AcademyTable />
    </div>
  );
}
