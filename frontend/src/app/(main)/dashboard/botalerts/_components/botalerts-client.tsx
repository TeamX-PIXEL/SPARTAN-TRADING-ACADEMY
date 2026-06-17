"use client";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";
import { type TableDataRow } from "./recent-leads-table/schema";
import { DataTable } from "./recent-leads-table/table";
import { BotsTab } from "./bots-tab";

export function BotalertsClient() {
  const [activeTab, setActiveTab] = useState("access");
  const [userData, setUserData] = useState<TableDataRow[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/botusers`);
        if (!res.ok) return;
        const rawData = await res.json();
        if (!rawData.success) return;

        const formattedData: TableDataRow[] = rawData.users.map((dbUser: any) => {
          let activeModel = "None";
          let activeExpiry = "N/A";

          if (dbUser.Evergreen_Expiry) {
            activeModel = "Evergreen";
            activeExpiry = dbUser.Evergreen_Expiry;
          }
          if (dbUser.Legacy_Expiry) {
            activeModel = "Legacy";
            activeExpiry = dbUser.Legacy_Expiry;
          }
          if (dbUser.Alpha_Expiry) {
            activeModel = "Alpha";
            activeExpiry = dbUser.Alpha_Expiry;
          }

          return {
            id: String(dbUser.id || "N/A"),
            key: dbUser.user_key || "No Key",
            user: dbUser.user || "Null",
            telegramId: String(dbUser.telegram_id || "Null"),
            model: activeModel,
            expiry: activeExpiry,
          };
        });

        setUserData(formattedData);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }
    fetchUsers();
  }, []);

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="access">Bot Access</TabsTrigger>
          <TabsTrigger value="bots">Bots</TabsTrigger>
        </TabsList>
        <TabsContent value="access">
          <DataTable data={userData} />
        </TabsContent>
        <TabsContent value="bots">
          <BotsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
