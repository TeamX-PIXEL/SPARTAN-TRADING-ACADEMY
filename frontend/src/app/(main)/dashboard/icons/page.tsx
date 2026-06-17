import {
  // Status Icons
  CheckCircle2, XCircle, AlertCircle, Info, HelpCircle,
  // Actions
  Plus, Edit, Trash, Save, Download, Upload, Share,
  // Navigation & UI
  Home, Settings, Users, BookOpen, LayoutDashboard, Menu,
  // Tech & SOC specific
  ShieldAlert, ShieldCheck, Terminal, Server, Database, Globe,
  // Spinners & Animated targets
  Loader, Loader2, RefreshCw, Settings2, Bell, ArrowRight
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function IconShowcasePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Icon Showcase</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A curated cheat sheet of Lucide icons and Tailwind animations for your dashboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* 1. The Animations Cheat Sheet */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Tailwind Animations</CardTitle>
            <CardDescription>Add these classes to ANY icon to bring it to life.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-blue-500" />
              <span className="text-xs font-mono bg-background px-1 py-0.5 rounded border">animate-spin</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-8 animate-spin text-green-500" />
              <span className="text-xs font-mono bg-background px-1 py-0.5 rounded border">animate-spin</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Settings2 className="size-8 animate-spin text-zinc-500" style={{ animationDuration: '3s' }} />
              <span className="text-xs font-mono bg-background px-1 py-0.5 rounded border">Slow spin</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Bell className="size-8 animate-pulse text-yellow-500" />
              <span className="text-xs font-mono bg-background px-1 py-0.5 rounded border">animate-pulse</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="size-8 animate-bounce text-purple-500" />
              <span className="text-xs font-mono bg-background px-1 py-0.5 rounded border">animate-bounce</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ShieldAlert className="size-8 animate-pulse text-red-500" />
              <span className="text-xs font-mono bg-background px-1 py-0.5 rounded border">animate-pulse</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Status Icons */}
        <Card>
          <CardHeader>
            <CardTitle>Status & Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center gap-1"><CheckCircle2 className="size-6 text-green-500" /><span className="text-[10px] text-muted-foreground">CheckCircle2</span></div>
            <div className="flex flex-col items-center gap-1"><XCircle className="size-6 text-red-500" /><span className="text-[10px] text-muted-foreground">XCircle</span></div>
            <div className="flex flex-col items-center gap-1"><AlertCircle className="size-6 text-yellow-500" /><span className="text-[10px] text-muted-foreground">AlertCircle</span></div>
            <div className="flex flex-col items-center gap-1"><Info className="size-6 text-blue-500" /><span className="text-[10px] text-muted-foreground">Info</span></div>
            <div className="flex flex-col items-center gap-1"><HelpCircle className="size-6 text-zinc-500" /><span className="text-[10px] text-muted-foreground">HelpCircle</span></div>
          </CardContent>
        </Card>

        {/* 3. Common Dashboard Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Common Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center gap-1"><Plus className="size-6" /><span className="text-[10px] text-muted-foreground">Plus</span></div>
            <div className="flex flex-col items-center gap-1"><Edit className="size-6" /><span className="text-[10px] text-muted-foreground">Edit</span></div>
            <div className="flex flex-col items-center gap-1"><Trash className="size-6 text-destructive" /><span className="text-[10px] text-muted-foreground">Trash</span></div>
            <div className="flex flex-col items-center gap-1"><Save className="size-6" /><span className="text-[10px] text-muted-foreground">Save</span></div>
            <div className="flex flex-col items-center gap-1"><Download className="size-6" /><span className="text-[10px] text-muted-foreground">Download</span></div>
            <div className="flex flex-col items-center gap-1"><Upload className="size-6" /><span className="text-[10px] text-muted-foreground">Upload</span></div>
          </CardContent>
        </Card>

        {/* 4. Tech & SOC Themes */}
        <Card>
          <CardHeader>
            <CardTitle>Tech & SOC Core</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center gap-1"><ShieldCheck className="size-6 text-green-600" /><span className="text-[10px] text-muted-foreground">ShieldCheck</span></div>
            <div className="flex flex-col items-center gap-1"><Terminal className="size-6" /><span className="text-[10px] text-muted-foreground">Terminal</span></div>
            <div className="flex flex-col items-center gap-1"><Server className="size-6" /><span className="text-[10px] text-muted-foreground">Server</span></div>
            <div className="flex flex-col items-center gap-1"><Database className="size-6" /><span className="text-[10px] text-muted-foreground">Database</span></div>
            <div className="flex flex-col items-center gap-1"><Globe className="size-6" /><span className="text-[10px] text-muted-foreground">Globe</span></div>
          </CardContent>
        </Card>

      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>To see all 1,450+ icons, visit <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">lucide.dev/icons</a></p>
      </div>
    </div>
  );
}
