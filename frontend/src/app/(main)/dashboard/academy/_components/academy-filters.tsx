"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AcademyFilters() {
  const [activeFilter, setActiveFilter] = useState("upcoming");

  return (
    <Tabs value={activeFilter} onValueChange={setActiveFilter}>
      <TabsList>
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        <TabsTrigger value="ongoing">On-Going</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
