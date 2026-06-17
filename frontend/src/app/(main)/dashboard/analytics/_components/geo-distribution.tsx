import { Globe } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GeoDistributionProps {
  data?: Array<{ country: string; code: string; users: number }>;
}

export function GeoDistribution({ data = [] }: GeoDistributionProps) {
  const hasData = data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Globe className="size-4" />
            Where Users Are From
          </span>
        </CardTitle>
        <CardDescription>Geographic distribution of buyers and subscribers.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ol className="space-y-2">
            {data.map((row) => (
              <li
                key={row.code}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground text-xs uppercase">{row.code}</span>
                  <span className="font-medium text-sm">{row.country}</span>
                </div>
                <span className="font-semibold text-sm tabular-nums">{row.users.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <Globe className="size-8 text-muted-foreground" />
            <p className="font-medium text-sm">No geo data available</p>
            <p className="max-w-sm text-muted-foreground text-xs">
              To populate this card, expose a <code className="rounded bg-muted px-1">country</code> field on your
              FastAPI <code className="rounded bg-muted px-1">/api/admin/botusers</code> and
              <code className="rounded bg-muted px-1">/api/admin/courses</code> /
              <code className="rounded bg-muted px-1">/fetch/indicators</code> buyer records, or add a
              <code className="rounded bg-muted px-1"> /api/analytics/geo</code> endpoint that returns
              <code className="rounded bg-muted px-1"> {`[{ country, code, users }]`}</code>.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
