"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { TableDataRow } from "./schema";

interface EditUserDialogProps {
  user: TableDataRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = "details" | "models" | "symbols" | "timeframes" | "entry-types" | "modifiers" | "trend";

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("details");

  if (!user) return null;

  const sidebarTabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "User Details" },
    { key: "models", label: "Models" },
    { key: "symbols", label: "Symbols" },
    { key: "timeframes", label: "Timeframes" },
    { key: "entry-types", label: "Entry Types" },
    { key: "modifiers", label: "Entry Modifiers" },
    { key: "trend", label: "Trend Direction" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* min-h-0 is crucial for flexbox scrolling bugs */}
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
        
        <DialogHeader className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <DialogTitle className="text-xl text-gray-900">
            Edit Configuration: <span className="text-primary font-mono ml-1">{user.user}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Two-column layout with min-h-0 to force scrolling instead of expanding */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-1/4 border-r border-gray-100 bg-gray-50/30 p-4 flex flex-col gap-1 overflow-y-auto">
            {sidebarTabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "secondary" : "ghost"}
                className={`justify-start w-full ${activeTab === tab.key ? "bg-white shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900"}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Main Content Area - Made into a flex-col so the footer stays anchored */}
          <div className="w-3/4 flex flex-col bg-white">
            
            {/* Scrollable Content Zone */}
            <div className="flex-1 p-6 overflow-y-auto">
              
              {activeTab === "details" && (
                <div className="space-y-6 max-w-md">
                  <h3 className="text-lg font-medium">User Details</h3>
                  <div className="space-y-2">
                    <Label>Telegram ID</Label>
                    <Input defaultValue={user.user} />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key</Label>
                    <Input defaultValue={user.key} className="font-mono text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label>Global Expiry</Label>
                    <Input type="text" defaultValue={user.expiry} />
                  </div>
                </div>
              )}

              {activeTab === "models" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium px-1">Bot Models</h3>
                  <Accordion type="single" collapsible className="w-full border rounded-lg overflow-hidden">
                    
                    {/* Evergreen Model */}
                    <AccordionItem value="evergreen" className="border-b">
                      <AccordionTrigger className="hover:no-underline py-3 px-4 bg-white hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Evergreen</span>
                          {user.model === "Evergreen" && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2 pb-4 bg-gray-50/50 border-t">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                            <Label className="font-medium cursor-pointer" htmlFor="evergreen-toggle">Enable Evergreen Model</Label>
                            <Switch id="evergreen-toggle" defaultChecked={user.model === "Evergreen"} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">Model Expiry Date</Label>
                            <Input type="date" className="bg-white" />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Legacy Model */}
                    <AccordionItem value="legacy" className="border-b">
                      <AccordionTrigger className="hover:no-underline py-3 px-4 bg-white hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Legacy</span>
                          {user.model === "Legacy" && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2 pb-4 bg-gray-50/50 border-t">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                            <Label className="font-medium cursor-pointer" htmlFor="legacy-toggle">Enable Legacy Model</Label>
                            <Switch id="legacy-toggle" defaultChecked={user.model === "Legacy"} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">Model Expiry Date</Label>
                            <Input type="date" className="bg-white" />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Alpha Model */}
                    <AccordionItem value="alpha" className="border-b-0">
                      <AccordionTrigger className="hover:no-underline py-3 px-4 bg-white hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-600">Alpha (Premium)</span>
                          {user.model === "Alpha" && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2 pb-4 bg-gray-50/50 border-t">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                            <Label className="font-medium cursor-pointer" htmlFor="alpha-toggle">Enable Alpha Model</Label>
                            <Switch id="alpha-toggle" defaultChecked={user.model === "Alpha"} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">Model Expiry Date</Label>
                            <Input type="date" className="bg-white" />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>
              )}

              {activeTab === "symbols" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Trading Symbols</h3>
                  <Accordion type="multiple" className="w-full border rounded-lg px-4">
                    
                    <AccordionItem value="currency">
                      <AccordionTrigger className="hover:no-underline">Currency Pairs (23)</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 pt-2">
                          {/* Full 23 Currency pairs to test scrolling! */}
                          {['EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'EURCAD', 'GBPCAD', 'EURNZD', 'GBPNZD', 'EURAUD', 'GBPAUD', 'AUDUSD', 'NZDUSD', 'AUDJPY', 'NZDJPY', 'AUDCHF', 'NZDCHF', 'AUDCAD', 'NZDCAD', 'USDCHF', 'USDCAD'].map((sym) => (
                            <div key={sym} className="flex items-center space-x-2">
                              <Checkbox id={`sym-${sym}`} />
                              <Label htmlFor={`sym-${sym}`} className="text-sm font-medium leading-none cursor-pointer">{sym}</Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="commodities">
                      <AccordionTrigger className="hover:no-underline">Commodities (4)</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 pt-2">
                          {['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL'].map((sym) => (
                            <div key={sym} className="flex items-center space-x-2">
                              <Checkbox id={`sym-${sym}`} />
                              <Label htmlFor={`sym-${sym}`} className="text-sm font-medium leading-none cursor-pointer">{sym}</Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>
              )}

              {activeTab === "timeframes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Timeframes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['1 Minute (1M)', '5 Minutes (5M)', '15 Minutes (15M)', '1 Hour (1H)', '4 Hours (4H)', '1 Day (1D)'].map((tf) => (
                      <div key={tf} className="flex items-center space-x-2 p-3 border rounded-md">
                        <Checkbox id={`tf-${tf}`} />
                        <Label htmlFor={`tf-${tf}`} className="font-medium cursor-pointer">{tf}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(activeTab === "entry-types" || activeTab === "modifiers" || activeTab === "trend") && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium capitalize">{activeTab.replace('-', ' ')}</h3>
                  <p className="text-muted-foreground text-sm">Configuration options for {activeTab.replace('-', ' ')} go here.</p>
                </div>
              )}

            </div>

            {/* Static Footer Anchored to Bottom */}
            <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button size="lg" onClick={() => onOpenChange(false)}>
                Save Changes
              </Button>
            </div>

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
