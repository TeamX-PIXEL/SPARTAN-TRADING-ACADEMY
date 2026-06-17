"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchWithAuth } from "@/lib/api-fetch";

import { indicatorColumns, purchaserColumns } from "./_components/recent-leads-table/columns";
import type { IndicatorRow, PurchaserRow } from "./_components/recent-leads-table/schema";
import { DataTable } from "./_components/recent-leads-table/table";

// Point this to your FastAPI backend
const API_URL = "http://127.0.0.1:8000";

export default function Page() {
  const [indicators, setIndicators] = useState<IndicatorRow[]>([]);
  const [purchasersMap, setPurchasersMap] = useState<Record<string, PurchaserRow[]>>({});
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorRow | null>(null);

  // Modal States
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [indicatorForm, setIndicatorForm] = useState<Partial<IndicatorRow>>({});
  const [indicatorThumbnailFile, setIndicatorThumbnailFile] = useState<File | null>(null);
  const [indicatorThumbnailPreview, setIndicatorThumbnailPreview] = useState<string | null>(null);

  const [isPurchaserModalOpen, setIsPurchaserModalOpen] = useState(false);
  const [purchaserForm, setPurchaserForm] = useState<Partial<PurchaserRow>>({});

  // --- FETCH DATA ON MOUNT ---
  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/fetch/indicators`);
      if (res.status === 401) return;
      if (!res.ok) throw new Error("Failed to fetch indicators");
      const data = await res.json();
      setIndicators(data);
    } catch (error) {
      console.error(error);
    }
  };

  // --- HANDLERS: INDICATORS (API INTEGRATION) ---
  const handleSaveIndicator = async () => {
    try {
      let showcaseImageUrl = indicatorForm.showcase_image || null;

      if (indicatorThumbnailFile) {
        const formData = new FormData();
        formData.append("file", indicatorThumbnailFile);
        const uploadRes = await fetch(`${API_URL}/api/upload/thumbnail`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          alert(err.detail || "Failed to upload thumbnail");
          return;
        }
        const uploadData = await uploadRes.json();
        showcaseImageUrl = uploadData.url;
      }

      if (indicatorForm.id) {
        // UPDATE (PATCH)
        const res = await fetchWithAuth(`${API_URL}/edit/indicator/${indicatorForm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            indicator_name: indicatorForm.indicator_name,
            indicator_description: indicatorForm.indicator_description,
            indicator_price: indicatorForm.indicator_price,
            showcase_image: showcaseImageUrl,
            pine_id: indicatorForm.pine_id,
            session_id: indicatorForm.session_id,
            status: indicatorForm.status,
            expiry_period: indicatorForm.expiry_period || null,
          }),
        });
        if (res.ok) fetchIndicators();
      } else {
        // CREATE (POST)
        const res = await fetchWithAuth(`${API_URL}/add/indicator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            indicator_name: indicatorForm.indicator_name || "New Indicator",
            indicator_description: indicatorForm.indicator_description || "",
            indicator_price: indicatorForm.indicator_price || 0,
            showcase_image: showcaseImageUrl,
            pine_id: indicatorForm.pine_id || null,
            session_id: indicatorForm.session_id || null,
            status: indicatorForm.status || "unavailable",
            expiry_period: indicatorForm.expiry_period || null,
          }),
        });
        if (res.ok) fetchIndicators();
      }
      setIndicatorThumbnailFile(null);
      setIndicatorThumbnailPreview(null);
      setIsIndicatorModalOpen(false);
    } catch (error) {
      console.error("Error saving indicator", error);
    }
  };

  const handleDeleteIndicator = async (indicator: IndicatorRow) => {
    if (!confirm(`Are you sure you want to delete ${indicator.indicator_name}?`)) return;

    try {
      const res = await fetchWithAuth(`${API_URL}/delete/indicator/${indicator.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIndicators((prev) => prev.filter((i) => i.id !== indicator.id));
      }
    } catch (error) {
      console.error("Error deleting indicator", error);
    }
  };

  // --- HANDLERS: PURCHASERS ---
  // (Keeping this local state for now until you build the Purchaser backend)
  const handleSavePurchaser = () => {
    if (!purchaserForm.productName) return;

    const targetInd = indicators.find((i) => i.indicator_name === purchaserForm.productName);
    if (!targetInd) return;

    setPurchasersMap((prev) => {
      const newState = { ...prev };

      if (purchaserForm.id) {
        if (selectedIndicator && selectedIndicator.indicator_name !== targetInd.indicator_name) {
          newState[selectedIndicator.id] = (newState[selectedIndicator.id] || []).filter(
            (p) => p.id !== purchaserForm.id,
          );
        }
        const targetList = newState[targetInd.id] || [];
        const exists = targetList.some((p) => p.id === purchaserForm.id);
        if (exists) {
          newState[targetInd.id] = targetList.map((p) =>
            p.id === purchaserForm.id ? ({ ...p, ...purchaserForm } as PurchaserRow) : p,
          );
        } else {
          newState[targetInd.id] = [...targetList, purchaserForm as PurchaserRow];
        }
      } else {
        const newPurchaser: PurchaserRow = {
          id: `usr_${Math.floor(Math.random() * 10000)}`,
          username: purchaserForm.username || "",
          productName: targetInd.indicator_name,
          purchasedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
          accessStatus: purchaserForm.accessStatus || "Approved",
          subscription: purchaserForm.subscription || "1 Month",
          expiresAt: "Pending calculation",
        };
        newState[targetInd.id] = [...(newState[targetInd.id] || []), newPurchaser];
      }
      return newState;
    });
    setIsPurchaserModalOpen(false);
  };

  // --- RENDER VIEWS ---
  if (selectedIndicator) {
    const purchasersData = purchasersMap[selectedIndicator.id] || [];
    return (
      <div className="w-full min-w-0 flex flex-col gap-4 md:gap-6 p-2 md:p-2 overflow-hidden">
        {/* ... KEEP YOUR PURCHASER DATA TABLE IDENTICAL ... */}
        {/* Just ensure pre-fill uses selectedIndicator.indicator_name */}
        <DataTable
          title={`Purchasers: ${selectedIndicator.indicator_name}`}
          // ... rest of the table
          rightAction={
            <Button
              size="icon"
              onClick={() => {
                setPurchaserForm({
                  accessStatus: "Approved",
                  subscription: "1 Month",
                  productName: selectedIndicator.indicator_name,
                });
                setIsPurchaserModalOpen(true);
              }}
            >
              <Plus className="size-4" />
            </Button>
          }
          // ...
        />
        {/* ... Keep purchaser dialog identical ... */}
      </div>
    );
  }

  // Default: Show the Indicators view
  return (
    <div className="w-full min-w-0 flex flex-col gap-4 md:gap-6 p-2 md:p-4 overflow-hidden">
      <DataTable
        title="Indicators"
        description="Manage your active Pine Script indicators and view sales."
        columns={indicatorColumns}
        data={indicators}
        meta={{
          onViewPurchasers: (indicator: IndicatorRow) => setSelectedIndicator(indicator),
          onEditIndicator: (indicator: IndicatorRow) => {
            setIndicatorForm(indicator);
            setIsIndicatorModalOpen(true);
          },
          onDeleteIndicator: handleDeleteIndicator, // Wired up!
        }}
        rightAction={
          <Button
            size="icon"
            onClick={() => {
              setIndicatorForm({ status: "unavailable" }); // Default status for new
              setIsIndicatorModalOpen(true);
            }}
          >
            <Plus className="size-4" />
          </Button>
        }
      />

      <Dialog open={isIndicatorModalOpen} onOpenChange={setIsIndicatorModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{indicatorForm.id ? "Edit Indicator" : "Create New Indicator"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Indicator Name</Label>
              <Input
                placeholder="e.g., Trend Analyzer"
                value={indicatorForm.indicator_name || ""}
                onChange={(e) => setIndicatorForm({ ...indicatorForm, indicator_name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                placeholder="Briefly describe what it does"
                value={indicatorForm.indicator_description || ""}
                onChange={(e) => setIndicatorForm({ ...indicatorForm, indicator_description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Thumbnail Image</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIndicatorThumbnailFile(file);
                    setIndicatorThumbnailPreview(URL.createObjectURL(file));
                  }
                }}
                className="file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              {(indicatorThumbnailPreview || indicatorForm.showcase_image) && (
                <div className="relative mt-2">
                  <img
                    src={
                      indicatorThumbnailPreview ||
                      (indicatorForm.showcase_image
                        ? indicatorForm.showcase_image.startsWith("http")
                          ? indicatorForm.showcase_image
                          : `${API_URL}${indicatorForm.showcase_image}`
                        : "")
                    }
                    alt="Preview"
                    className="w-full h-24 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIndicatorThumbnailFile(null);
                      setIndicatorThumbnailPreview(null);
                      setIndicatorForm({ ...indicatorForm, showcase_image: null });
                    }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                  >
                    X
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  placeholder="29.99"
                  value={indicatorForm.indicator_price || ""}
                  onChange={(e) => setIndicatorForm({ ...indicatorForm, indicator_price: parseFloat(e.target.value) })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={indicatorForm.status}
                  onValueChange={(val: any) => setIndicatorForm({ ...indicatorForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Expiry Period</Label>
              <Select
                value={indicatorForm.expiry_period || ""}
                onValueChange={(val) => setIndicatorForm({ ...indicatorForm, expiry_period: val || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expiry period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7D">7 Days</SelectItem>
                  <SelectItem value="1M">1 Month</SelectItem>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="6M">6 Months</SelectItem>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="1L">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* NEW FIELDS FOR PINE ID AND SESSION ID */}
            <div className="grid gap-2">
              <Label>Pine ID (Optional)</Label>
              <Input
                placeholder="Pine script ID"
                value={indicatorForm.pine_id || ""}
                onChange={(e) => setIndicatorForm({ ...indicatorForm, pine_id: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Session ID (Optional)</Label>
              <Input
                placeholder="TradingView Session ID"
                value={indicatorForm.session_id || ""}
                onChange={(e) => setIndicatorForm({ ...indicatorForm, session_id: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIndicatorModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveIndicator}>Save Indicator</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
