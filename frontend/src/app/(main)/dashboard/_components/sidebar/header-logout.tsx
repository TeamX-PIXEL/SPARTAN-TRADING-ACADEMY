"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function HeaderLogout() {
  return (
    <Button size="icon" onClick={() => signOut({ callbackUrl: "/auth/v1/login" })} aria-label="Logout">
      <LogOut className="size-4" />
    </Button>
  );
}
