"use client";

import * as React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Trash } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

import type { ParticipantRow } from "./participants-schema";

function DeleteAction({ user, batchId }: { user: ParticipantRow; batchId: string }) {
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/batches/${batchId}/participants/${user.user_id}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
          <Trash className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Participant</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <span className="font-medium text-foreground">{user.user_name}</span> from
            this batch?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function getParticipantColumns(batchId: string): ColumnDef<ParticipantRow>[] {
  return [
    {
      accessorKey: "user_id",
      header: "User ID",
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.user_id}</span>,
    },
    {
      accessorKey: "user_name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.user_name}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return (
          <span className="text-muted-foreground">
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <DeleteAction user={row.original} batchId={batchId} />,
    },
  ];
}
