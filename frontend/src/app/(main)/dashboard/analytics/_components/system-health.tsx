import { Activity, Bot, Database, GraduationCap, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type ModuleStatus = "ok" | "warn" | "down";

export interface SystemHealth {
  apiStatus: ModuleStatus;
  apiLatencyMs: number | null;
  courses: ModuleStatus;
  indicators: ModuleStatus;
  botAlerts: ModuleStatus;
  lastSyncAt: string | null;
}

interface SystemHealthStripProps {
  health: SystemHealth;
}

const statusStyles: Record<
  ModuleStatus,
  { dot: string; label: string; variant: "default" | "secondary" | "destructive" }
> = {
  ok: { dot: "bg-green-500", label: "Healthy", variant: "default" },
  warn: { dot: "bg-yellow-500", label: "Degraded", variant: "secondary" },
  down: { dot: "bg-red-500", label: "Down", variant: "destructive" },
};

function ModulePill({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: ModuleStatus;
}) {
  const style = statusStyles[status];
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
      <span className={`inline-block size-2 rounded-full ${style.dot}`} aria-hidden />
      <Icon className="size-4 text-muted-foreground" />
      <div className="flex flex-col leading-tight">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium text-sm">{style.label}</span>
      </div>
    </div>
  );
}

export function SystemHealthStrip({ health }: SystemHealthStripProps) {
  const { apiStatus, apiLatencyMs, courses, indicators, botAlerts, lastSyncAt } = health;
  return (
    <div className="@container/health flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Activity className="size-5 text-muted-foreground" />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-sm">System Health</span>
          <span className="text-muted-foreground text-xs">
            {lastSyncAt ? `Last sync ${new Date(lastSyncAt).toLocaleString()}` : "No successful sync recorded yet"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:flex-wrap md:items-center">
        <ModulePill icon={Database} label="FastAPI" status={apiStatus} />
        <ModulePill icon={GraduationCap} label="Academy" status={courses} />
        <ModulePill icon={TrendingUp} label="Indicators" status={indicators} />
        <ModulePill icon={Bot} label="Bot Alerts" status={botAlerts} />
      </div>

      {apiLatencyMs !== null && (
        <Badge variant="outline" className="self-start md:self-auto">
          {apiLatencyMs}ms ping
        </Badge>
      )}
    </div>
  );
}
