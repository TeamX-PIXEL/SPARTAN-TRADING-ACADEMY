import { BatchesTable } from "./_components/table";
import type { BatchRow } from "./_components/schema";

const batchData: BatchRow[] = [
  {
    batchId: "B-APR26",
    batchName: "April 2026",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    status: "In Progress",
    chaptersFinished: 3,
    totalChapters: 12,
  },
  {
    batchId: "B-MAR26",
    batchName: "March 2026",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    status: "Ongoing",
    chaptersFinished: 7,
    totalChapters: 12,
  },
  {
    batchId: "B-JAN26",
    batchName: "January 2026",
    startDate: "2026-01-10",
    endDate: "2026-03-25",
    status: "Finished",
    chaptersFinished: 12,
    totalChapters: 12,
  },
];

export default function BatchesPage() {
  return (
    <div className="p-6">
      <BatchesTable data={batchData} />
    </div>
  );
}
