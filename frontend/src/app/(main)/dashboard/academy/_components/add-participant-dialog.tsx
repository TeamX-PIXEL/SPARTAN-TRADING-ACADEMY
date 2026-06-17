"use client";

import * as React from "react";

import { Search, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

type SearchResult = {
  id: number;
  UserID: string;
  UserName: string;
  email: string;
};

export function AddParticipantDialog({ batchId }: { batchId: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [selected, setSelected] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState("");
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSearch = React.useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSelect = (user: SearchResult) => {
    setSelected(user);
    setQuery(`@${user.UserID} — ${user.UserName} (${user.email})`);
    setResults([]);
  };

  const handleClear = React.useCallback(() => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setError("");
  }, []);

  const handleSubmit = async () => {
    if (!selected) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/batches/${batchId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selected.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to add participant");
      }

      setOpen(false);
      handleClear();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!open) {
      handleClear();
    }
  }, [open, handleClear]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 size-4" />
          Add Participant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Participant</DialogTitle>
          <DialogDescription>
            Search for a user by email or <code className="rounded bg-muted px-1 text-xs">@UserID</code> to add them to
            this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-2">
          <div className="relative">
            {selected ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <span className="flex-1 text-sm">{query}</span>
                <Button variant="ghost" size="icon" className="size-6" onClick={handleClear}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Type email or @UserID..."
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);
                    if (!selected) handleSearch(val);
                  }}
                />
              </div>
            )}

            {!selected && searching && <p className="text-muted-foreground text-xs">Searching...</p>}

            {!selected && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                <ul className="max-h-48 overflow-auto py-1">
                  {results.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => handleSelect(user)}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{user.UserName}</p>
                          <p className="text-muted-foreground text-xs">
                            @{user.UserID} &middot; {user.email}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!selected && !searching && query.trim() && results.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                <p className="px-3 py-4 text-center text-muted-foreground text-sm">No users found</p>
              </div>
            )}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selected || loading}>
            {loading ? "Adding..." : "Add to Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
