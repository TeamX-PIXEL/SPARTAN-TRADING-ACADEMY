"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bitcoin,
  Box,
  Calendar,
  CheckCheck,
  ChevronDown,
  Clock,
  Coins,
  Crown,
  DollarSign,
  FileText,
  Gem,
  History,
  Layers,
  Leaf,
  LogIn,
  PackageOpen,
  Rocket,
  Save,
  Send,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

// --- CONSTANTS ---
const CURRENCIES = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "EURJPY",
  "GBPJPY",
  "EURCHF",
  "GBPCHF",
  "EURCAD",
  "GBPCAD",
  "EURNZD",
  "GBPNZD",
  "EURAUD",
  "GBPAUD",
  "AUDUSD",
  "NZDUSD",
  "AUDJPY",
  "NZDJPY",
  "AUDCHF",
  "NZDCHF",
  "AUDCAD",
  "NZDCAD",
  "USDCHF",
  "USDCAD",
];
const COMMODITIES = ["XAUUSD", "XAGUSD", "USOIL", "UKOIL"];
const CRYPTO = ["BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT"];
const INDICES = ["NAS100", "SPX500", "US30", "DXY", "BANKNIFTY", "NIFTY"];
const FUTURES = [
  "YM",
  "NQ",
  "MYM",
  "MNQ",
  "MCL",
  "MRB",
  "MES",
  "CL",
  "RB",
  "GC",
  "SI",
  "6E",
  "6B",
  "6A",
  "6N",
  "BTC",
  "ETH",
  "ES",
];

const BASIC_PACKAGE = [
  "EURUSD",
  "GBPUSD",
  "XAUUSD",
  "BTCUSD",
  "ETHUSD",
  "NAS100",
  "SPX500",
  "USDJPY",
  "XAGUSD",
  "US30",
];
const PRO_PACKAGE = [
  ...BASIC_PACKAGE,
  "EURJPY",
  "GBPJPY",
  "BTCUSDT",
  "ETHUSDT",
  "DXY",
  "YM",
  "NQ",
  "CL",
  "GC",
  "EURCHF",
  "GBPCHF",
  "AUDUSD",
  "NZDUSD",
  "USOIL",
  "UKOIL",
];

type StrategyTier = "Core" | "Advanced" | "Experimental";

const ENTRY_TYPES = [
  {
    id: "CR",
    name: "Candlestick Rejection",
    category: "Price Action",
    desc: "Basic reversal pattern at key levels.",
    tier: "Core" as StrategyTier,
    winRate: 68,
  },
  {
    id: "BRK",
    name: "Breakout",
    category: "Momentum",
    desc: "Momentum trade on structural breaks.",
    tier: "Core" as StrategyTier,
    winRate: 54,
  },
  {
    id: "CISD",
    name: "Change in State",
    category: "Reversal",
    desc: "Early reversal signal based on delivery.",
    tier: "Advanced" as StrategyTier,
    winRate: 72,
  },
  {
    id: "CISD_PCL",
    name: "CISD Price Close",
    category: "Confirmation",
    desc: "Confirmed CISD with closed candle.",
    tier: "Advanced" as StrategyTier,
    winRate: 76,
  },
  {
    id: "LCY",
    name: "Liquidity",
    category: "Smart Money",
    desc: "Entries based on resting liquidity pools.",
    tier: "Advanced" as StrategyTier,
    winRate: 62,
  },
  {
    id: "LCY_Sweep",
    name: "Liquidity Sweep",
    category: "Aggressive",
    desc: "Aggressive entry immediately after a sweep.",
    tier: "Experimental" as StrategyTier,
    winRate: 48,
  },
];

const MODIFIERS = [
  { id: "mod_OP", label: "OP" },
  { id: "mod_Zone", label: "Zone" },
  { id: "mod_FirstClass", label: "First Class" },
  { id: "mod_TPR", label: "TPR" },
  { id: "mod_SwingSMT", label: "Swing SMT" },
  { id: "mod_MitigationSMT", label: "Mitigation SMT" },
];

const tierTone: Record<StrategyTier, string> = {
  Core: "border-green-500/35 bg-green-500/10 text-green-700 dark:text-green-400",
  Advanced: "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Experimental: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const userId = resolvedParams.id;

  // --- SESSION HOOK ---
  const { data: session } = useSession(); // <-- ADDED GRAB SESSION

  // --- STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = React.useState(true);

  const [userInfo, setUserInfo] = React.useState({ username: "", telegramId: "", key: "" });
  const [models, setModels] = React.useState({
    evergreen: { enabled: false, expiry: "" },
    legacy: { enabled: false, expiry: "" },
    alpha: { enabled: false, expiry: "" },
  });

  const [selectedSymbols, setSelectedSymbols] = React.useState<Set<string>>(new Set());
  const [selectedTimeframes, setSelectedTimeframes] = React.useState<Set<string>>(new Set());
  const [selectedEntries, setSelectedEntries] = React.useState<Set<string>>(new Set());
  const [selectedModifiers, setSelectedModifiers] = React.useState<Set<string>>(new Set());
  const [selectedTrends, setSelectedTrends] = React.useState({ bull: false, bear: false });

  const [packageName, setPackageName] = React.useState("Custom Selection");
  const [timeframeName, setTimeframeName] = React.useState("Custom Timeframes");

  // --- FETCH DATA FROM PYTHON BACKEND ON PAGE LOAD ---
  React.useEffect(() => {
    // Prevent fetching if we don't have the token yet
    if (!session?.accessToken) return;

    async function fetchUserData() {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/botusers/${userId}`);
        const result = await response.json();

        if (response.ok && result.success) {
          const u = result.user;

          setUserInfo({
            username: u.user || "",
            telegramId: u.telegram_id || "",
            key: u.user_key || "",
          });

          setModels({
            evergreen: { enabled: u.Evergreen_Access === 1, expiry: u.Evergreen_Expiry || "" },
            legacy: { enabled: u.Legacy_Access === 1, expiry: u.Legacy_Expiry || "" },
            alpha: { enabled: u.Alpha_Access === 1, expiry: u.Alpha_Expiry || "" },
          });

          const syms = new Set<string>();
          [...CURRENCIES, ...COMMODITIES, ...CRYPTO, ...INDICES, ...FUTURES].forEach((sym) => {
            if (u[`Evergreen_${sym}`] === 1 || u[`Legacy_${sym}`] === 1 || u[`Alpha_${sym}`] === 1) syms.add(sym);
          });
          setSelectedSymbols(syms);

          const tfs = new Set<string>();
          ["1M", "5M", "15M", "1H", "4H", "1D"].forEach((tf) => {
            if (u[`Evergreen_${tf}`] === 1 || u[`Legacy_${tf}`] === 1 || u[`Alpha_${tf}`] === 1) tfs.add(tf);
          });
          setSelectedTimeframes(tfs);

          const ents = new Set<string>();
          ["CR", "BRK", "CISD", "CISD_PCL", "LCY", "LCY_Sweep"].forEach((entry) => {
            if (entry === "CR") {
              if (u.Evergreen_CR === 1 || u.Legacy_CR === 1) ents.add(entry);
            } else {
              if (u[entry] === 1) ents.add(entry);
            }
          });
          setSelectedEntries(ents);

          const mods = new Set<string>();
          if (u.BRK_OP === 1 || u.CISD_OP === 1 || u.LCY_OP === 1 || u.Evergreen_CR_OP === 1) mods.add("mod_OP");
          if (u.Evergreen_Zone === 1 || u.Legacy_Zone === 1 || u.Alpha_Zone === 1) mods.add("mod_Zone");
          if (u.LCY_First_Class === 1 || u.Legacy_CR_First_Class === 1) mods.add("mod_FirstClass");
          if (u.LCY_TPR === 1 || u.Legacy_CR_TPR === 1) mods.add("mod_TPR");
          if (u.BRK_Swing_SMT === 1 || u.CISD_Swing_SMT === 1) mods.add("mod_SwingSMT");
          if (u.BRK_Mitigation_SMT === 1 || u.CISD_Mitigation_SMT === 1) mods.add("mod_MitigationSMT");
          setSelectedModifiers(mods);

          setSelectedTrends({
            bull: u.Evergreen_Bull === 1 || u.Legacy_Bull === 1 || u.Alpha_Bull === 1,
            bear: u.Evergreen_Bear === 1 || u.Legacy_Bear === 1 || u.Alpha_Bear === 1,
          });
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [userId, session?.accessToken]); // <-- ADDED SESSION TO DEPENDENCY ARRAY

  // --- HANDLERS ---
  const extendExpiry = (days: number, model: "evergreen" | "legacy" | "alpha") => {
    setModels((prev) => {
      const current = prev[model].expiry;
      const date = current ? new Date(current) : new Date();
      date.setDate(date.getDate() + days);
      return { ...prev, [model]: { ...prev[model], expiry: date.toISOString().split("T")[0] } };
    });
  };

  const toggleModel = (model: "evergreen" | "legacy" | "alpha", checked: boolean) => {
    setModels((prev) => ({ ...prev, [model]: { ...prev[model], enabled: checked } }));
  };

  const handleSymbolToggle = (symbol: string, checked: boolean) => {
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (checked) next.add(symbol);
      else next.delete(symbol);
      return next;
    });
    setPackageName("Custom Selection");
  };

  const selectPackage = (type: "basic" | "pro" | "premium" | "clear") => {
    if (type === "basic") {
      setSelectedSymbols(new Set(BASIC_PACKAGE));
      setPackageName("Basic (10)");
    } else if (type === "pro") {
      setSelectedSymbols(new Set(PRO_PACKAGE));
      setPackageName("Pro (25)");
    } else if (type === "premium") {
      setSelectedSymbols(new Set([...CURRENCIES, ...COMMODITIES, ...CRYPTO, ...INDICES, ...FUTURES]));
      setPackageName("Premium (55)");
    } else if (type === "clear") {
      setSelectedSymbols(new Set());
      setPackageName("Quick Packages");
    }
  };

  const handleTimeframeToggle = (tf: string, checked: boolean) => {
    setSelectedTimeframes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(tf);
      else next.delete(tf);
      return next;
    });
    setTimeframeName("Custom Timeframes");
  };

  const selectTimeframePreset = (type: "scalper" | "day" | "swing" | "all") => {
    if (type === "scalper") {
      setSelectedTimeframes(new Set(["1M", "5M"]));
      setTimeframeName("Scalper");
    } else if (type === "day") {
      setSelectedTimeframes(new Set(["15M", "1H"]));
      setTimeframeName("Day Trader");
    } else if (type === "swing") {
      setSelectedTimeframes(new Set(["1H", "4H"]));
      setTimeframeName("Swing Trader");
    } else if (type === "all") {
      setSelectedTimeframes(new Set(["1M", "5M", "15M", "1H", "4H", "1D"]));
      setTimeframeName("All Timeframes");
    }
  };

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const formattedKey = result.match(/.{1,4}/g)?.join("-") || result;
    setUserInfo((prev) => ({ ...prev, key: formattedKey }));
  };

  // --- SUBMIT TO FLASK BACKEND (JSON VERSION) ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!models.evergreen.enabled && !models.legacy.enabled && !models.alpha.enabled) {
      alert("Please enable at least one model access");
      return;
    }

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    const entries: string[] = [];
    ["CR", "BRK", "CISD", "CISD_PCL", "LCY", "LCY_Sweep"].forEach((entry) => {
      if (formData.get(`entry_${entry}`)) entries.push(entry);
    });

    ["mod_OP", "mod_FirstClass", "mod_TPR", "mod_SwingSMT", "mod_MitigationSMT", "mod_Zone"].forEach((mod) => {
      if (formData.get(mod)) entries.push(mod);
    });

    const isBull = !!formData.get("trend_Bull");
    const isBear = !!formData.get("trend_Bear");
    const isZone = !!formData.get("mod_Zone");

    const symbolsObj: Record<string, string[]> = {};
    const timeframesObj: Record<string, string[]> = {};
    const trendsObj: Record<string, { bull: boolean; bear: boolean; zone: boolean }> = {};

    ["evergreen", "legacy", "alpha"].forEach((prefix) => {
      symbolsObj[prefix] = Array.from(selectedSymbols);
      timeframesObj[prefix] = Array.from(selectedTimeframes);
      trendsObj[prefix] = { bull: isBull, bear: isBear, zone: isZone };
    });

    const payload = {
      user: userInfo.username || null,
      telegram_id: userInfo.telegramId || null,
      user_key: userInfo.key,

      evergreen_access: models.evergreen.enabled ? 1 : 0,
      legacy_access: models.legacy.enabled ? 1 : 0,
      alpha_access: models.alpha.enabled ? 1 : 0,

      evergreen_expiry: models.evergreen.expiry || "2099-12-31",
      legacy_expiry: models.legacy.expiry || "2099-12-31",
      alpha_expiry: models.alpha.expiry || "2099-12-31",

      symbols: symbolsObj,
      timeframes: timeframesObj,
      trends: trendsObj,
      entries: entries,
    };

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/admin/botusers/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        router.push("/dashboard/botalerts");
        router.refresh();
      } else {
        alert(`Failed to update user: ${responseData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Network error updating user:", error);
      alert("Failed to connect to the backend.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-background">
        <div className="flex flex-col items-center">
          <Clock className="w-8 h-8 animate-spin text-primary mb-4" />
          <p>Loading user profile...</p>
        </div>
      </div>
    );
  }

  // ... (Your existing JSX return remains down here)

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
      <div className="max-w-5xl mx-auto p-2 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 bg-background hover:bg-muted border-border"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit User Profile</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:ml-[56px]">
            Modify user credentials, algorithm access limits, and core trading configuration preferences.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Information */}
          <Card className="p-4 gap-3 mt-4">
            <CardHeader className="p-0 border-b-2 border-border/50 pb-1 mb-2 flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Profile Information</span>
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-muted-foreground truncate">
                  Set up primary identification and external platform bindings.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <Label className="block text-sm font-medium text-muted-foreground mb-2">
                    Username <span className="text-xs font-normal text-muted-foreground/70 ml-1">(Optional)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="@username"
                    className="bg-background text-foreground border-border"
                    value={userInfo.username}
                    onChange={(e) => setUserInfo({ ...userInfo, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-muted-foreground mb-2">
                    Telegram ID <span className="text-xs font-normal text-muted-foreground/70 ml-1">(Optional)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g., 1029384756"
                    className="bg-background text-foreground border-border"
                    value={userInfo.telegramId}
                    onChange={(e) => setUserInfo({ ...userInfo, telegramId: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-muted-foreground mb-2">License / API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter or generate key"
                      className="bg-background text-foreground border-border font-mono text-sm"
                      value={userInfo.key}
                      onChange={(e) => setUserInfo({ ...userInfo, key: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 bg-muted/50 hover:bg-muted border-border"
                      onClick={generateKey}
                      title="Generate Random Key"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Access & Subscription */}
          <Card className="p-2 gap-3">
            <CardHeader className="p-4 border-b-2 border-border/50 pb-0 mb-0 flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="flex-1 min-w-0 ml-6">
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Model Access & Subscription</span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground truncate">
                  Manage user access tiers and expiration dates for the algorithmic trading models.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-2">
              <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card">
                {/* Evergreen Model Row */}
                <div
                  className={`p-4 sm:p-5 border-b border-border/50 transition-colors ${models.evergreen.enabled ? "bg-blue-500/5" : "hover:bg-muted/30"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${models.evergreen.enabled ? "bg-blue-500/20" : "bg-muted"}`}>
                        <Leaf
                          className={`w-4 h-4 ${models.evergreen.enabled ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}
                        />
                      </div>
                      <span
                        className={`font-medium text-lg flex items-center ${models.evergreen.enabled ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        Evergreen Model
                      </span>
                    </div>
                    <Switch
                      id="evergreen_access"
                      checked={models.evergreen.enabled}
                      onCheckedChange={(c) => toggleModel("evergreen", c)}
                    />
                  </div>

                  <div className={models.evergreen.enabled ? "block mt-5 pt-5" : "hidden"}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-3">Expiry Date</Label>
                        <Input
                          type="date"
                          className="bg-background"
                          value={models.evergreen.expiry}
                          onChange={(e) =>
                            setModels((p) => ({ ...p, evergreen: { ...p.evergreen, expiry: e.target.value } }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-3">Quick Actions</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                            onClick={() => extendExpiry(30, "evergreen")}
                          >
                            +1 Month
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                            onClick={() => extendExpiry(90, "evergreen")}
                          >
                            +3 Months
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                            onClick={() => extendExpiry(365, "evergreen")}
                          >
                            +1 Year
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legacy Model Row */}
                <div
                  className={`p-4 sm:p-5 border-b border-border/50 transition-colors ${models.legacy.enabled ? "bg-amber-500/5" : "hover:bg-muted/30"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${models.legacy.enabled ? "bg-amber-500/20" : "bg-muted"}`}>
                        <History
                          className={`w-4 h-4 ${models.legacy.enabled ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                        />
                      </div>
                      <span
                        className={`font-medium text-lg flex items-center ${models.legacy.enabled ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        Legacy Model
                      </span>
                    </div>
                    <Switch
                      id="legacy_access"
                      checked={models.legacy.enabled}
                      onCheckedChange={(c) => toggleModel("legacy", c)}
                    />
                  </div>

                  <div className={models.legacy.enabled ? "block mt-5 pt-5" : "hidden"}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-3">Expiry Date</Label>
                        <Input
                          type="date"
                          className="bg-background"
                          value={models.legacy.expiry}
                          onChange={(e) =>
                            setModels((p) => ({ ...p, legacy: { ...p.legacy, expiry: e.target.value } }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-3">Quick Actions</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => extendExpiry(30, "legacy")}
                          >
                            +1 Month
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => extendExpiry(90, "legacy")}
                          >
                            +3 Months
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => extendExpiry(365, "legacy")}
                          >
                            +1 Year
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alpha Model Row */}
                <div
                  className={`p-4 sm:p-5 transition-colors ${models.alpha.enabled ? "bg-purple-500/5" : "hover:bg-muted/30"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${models.alpha.enabled ? "bg-purple-500/20" : "bg-muted"}`}>
                        <Rocket
                          className={`w-4 h-4 ${models.alpha.enabled ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}
                        />
                      </div>
                      <span
                        className={`font-medium text-lg flex items-center ${models.alpha.enabled ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        Alpha Model
                      </span>
                    </div>
                    <Switch
                      id="alpha_access"
                      checked={models.alpha.enabled}
                      onCheckedChange={(c) => toggleModel("alpha", c)}
                    />
                  </div>

                  <div className={models.alpha.enabled ? "block mt-5 pt-5" : "hidden"}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 mt-5">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-3">Expiry Date</Label>
                        <Input
                          type="date"
                          className="bg-background"
                          value={models.alpha.expiry}
                          onChange={(e) => setModels((p) => ({ ...p, alpha: { ...p.alpha, expiry: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-3">Quick Actions</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            onClick={() => extendExpiry(30, "alpha")}
                          >
                            +1 Month
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            onClick={() => extendExpiry(90, "alpha")}
                          >
                            +3 Months
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            onClick={() => extendExpiry(365, "alpha")}
                          >
                            +1 Year
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Symbols Selection */}
          <Card className="p-2 gap-3">
            <CardHeader className="p-4 border-b-2 border-border/50 pb-0 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center ml-6">
                <TrendingUp className="w-5 h-5 mr-2" /> Symbols Selection
              </CardTitle>

              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                  {selectedSymbols.size}/55 Selected
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-fit gap-2 bg-background hover:bg-muted border-input">
                      <span className="flex items-center text-foreground">
                        <Box className="w-4 h-4 mr-2 text-primary" />
                        {packageName}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[220px] rounded-xl p-1 z-[999]">
                    <DropdownMenuItem
                      onSelect={() => selectPackage("basic")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-blue-500/10"
                    >
                      <Box className="mr-3 h-4 w-4 text-blue-500" />
                      <span className="font-medium text-blue-500">Basic (10)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => selectPackage("pro")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-green-500/10"
                    >
                      <PackageOpen className="mr-3 h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-500">Pro (25)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => selectPackage("premium")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-purple-500/10"
                    >
                      <Gem className="mr-3 h-4 w-4 text-purple-500" />
                      <span className="font-medium text-purple-500">Premium (55)</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-border" />
                    <DropdownMenuItem
                      onSelect={() => selectPackage("premium")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-muted"
                    >
                      <CheckCheck className="mr-3 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Select All</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => selectPackage("clear")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-red-500/10"
                    >
                      <X className="mr-3 h-4 w-4 text-destructive" />
                      <span className="font-medium text-destructive">Clear All</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Reusable Symbol Grid Component */}
              {[
                { title: "Currency Pairs", icon: DollarSign, count: 23, data: CURRENCIES },
                { title: "Commodities", icon: Coins, count: 4, data: COMMODITIES },
                { title: "Cryptocurrency", icon: Bitcoin, count: 4, data: CRYPTO },
                { title: "Indices", icon: TrendingUp, count: 6, data: INDICES },
                { title: "Futures", icon: FileText, count: 18, data: FUTURES },
              ].map((group) => (
                <div key={group.title} className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h6 className="font-medium text-sm flex items-center">
                      <group.icon className="w-4 h-4 mr-2" /> {group.title} ({group.count})
                    </h6>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-muted/30 p-4 rounded-xl max-h-[400px] overflow-y-auto border border-border">
                    {group.data.map((sym) => (
                      <div
                        key={sym}
                        className="flex items-center p-2 bg-background rounded-lg hover:bg-accent hover:text-accent-foreground hover:translate-x-1 transition-transform border border-border shadow-sm"
                      >
                        <Checkbox
                          id={`sym-${sym}`}
                          checked={selectedSymbols.has(sym)}
                          onCheckedChange={(c) => handleSymbolToggle(sym, !!c)}
                          className="mr-2"
                        />
                        <Label htmlFor={`sym-${sym}`} className="text-sm cursor-pointer w-full">
                          {sym}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeframes */}
          <Card className="p-4 gap-2">
            <CardHeader className="p-0 border-b-2 border-border/50 pb-3 mb-1 flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Timeframes</span>
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-muted-foreground truncate">
                  Define the chart intervals and candle durations the bot will analyze.
                </CardDescription>
              </div>

              <div className="flex items-center shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 bg-background hover:bg-muted border-input min-w-0 max-w-[140px] sm:max-w-none"
                    >
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate text-foreground">{timeframeName}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[260px] rounded-xl p-1">
                    <DropdownMenuItem
                      onSelect={() => selectTimeframePreset("scalper")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-blue-500/10"
                    >
                      <Zap className="mr-3 h-4 w-4 text-blue-500" />
                      <span className="font-medium text-foreground">Scalper (1M, 5M)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => selectTimeframePreset("day")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-green-500/10"
                    >
                      <Sun className="mr-3 h-4 w-4 text-green-500" />
                      <span className="font-medium text-foreground">Day Trader (15M, 1H)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => selectTimeframePreset("swing")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-purple-500/10"
                    >
                      <Activity className="mr-3 h-4 w-4 text-purple-500" />
                      <span className="font-medium text-foreground">Swing Trader (1H, 4H)</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-border" />
                    <DropdownMenuItem
                      onSelect={() => selectTimeframePreset("all")}
                      className="cursor-pointer py-2.5 rounded-lg focus:bg-muted"
                    >
                      <Layers className="mr-3 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">All Timeframes</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-muted/30 p-4 rounded-xl max-h-[400px] overflow-y-auto border border-border">
                {["1M", "5M", "15M", "1H", "4H", "1D"].map((tf) => (
                  <div
                    key={tf}
                    className="flex items-center p-2 bg-background rounded-lg hover:bg-accent hover:text-accent-foreground hover:translate-x-1 transition-transform border border-border shadow-sm"
                  >
                    <Checkbox
                      id={`tf-${tf}`}
                      checked={selectedTimeframes.has(tf)}
                      onCheckedChange={(c) => handleTimeframeToggle(tf, !!c)}
                      className="mr-2"
                    />
                    <Label htmlFor={`tf-${tf}`} className="text-sm cursor-pointer w-full">
                      {tf === "1M"
                        ? "1 Min"
                        : tf === "5M"
                          ? "5 Min"
                          : tf === "15M"
                            ? "15 Min"
                            : tf === "1H"
                              ? "1 Hr"
                              : tf === "4H"
                                ? "4 Hrs"
                                : "1 Day"}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Entry Types (Inline Ledger Style) */}
          <Card className="p-4">
            <CardHeader className="p-0 border-b-2 border-border/50 pb-1 mb-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center">
                  <LogIn className="w-5 h-5 mr-2" /> Trading Entry Types
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-muted-foreground">
                  Configure algorithmic access to specific market entry conditions.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Shadcn UI Styled Table */}
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="h-10 text-xs font-semibold text-muted-foreground">Strategy</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-muted-foreground">Description</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-muted-foreground">Classification</TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-muted-foreground text-right">
                        Win Rate
                      </TableHead>
                      <TableHead className="h-10 text-xs font-semibold text-muted-foreground text-center">
                        Enable
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ENTRY_TYPES.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50 transition-colors border-border">
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1">
                            <p className="font-bold text-sm text-foreground">{row.id}</p>
                            <p className="text-muted-foreground text-xs">{row.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1 max-w-64">
                            <p className="text-sm font-medium text-foreground">{row.category}</p>
                            <p className="text-xs text-muted-foreground truncate">{row.desc}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-[10px] uppercase ${tierTone[row.tier]}`}>
                            {row.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Badge
                            variant="outline"
                            className={`min-w-14 justify-center font-bold tabular-nums ${
                              row.winRate >= 70
                                ? "border-green-500/35 bg-green-500/10 text-green-700 dark:text-green-400"
                                : row.winRate >= 55
                                  ? "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                  : "border-destructive/35 bg-destructive/10 text-destructive dark:text-red-400"
                            }`}
                          >
                            {row.winRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex justify-center">
                            {/* FIX: Bound native defaultChecked to the fetched React State */}
                            <Checkbox
                              id={`entry_${row.id}`}
                              name={`entry_${row.id}`}
                              defaultChecked={selectedEntries.has(row.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Entry Modifiers & Trend Direction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4 gap-3">
              <CardHeader className="p-0  border-border/50 space-y-0">
                <CardTitle className="flex items-center">
                  <SlidersHorizontal className="w-5 h-5 mr-2" /> Entry Modifiers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-muted/30 p-4 rounded-xl max-h-[400px] overflow-y-auto border border-border">
                  {MODIFIERS.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center p-2 bg-background rounded-lg hover:bg-accent hover:text-accent-foreground hover:translate-x-1 transition-transform border border-border shadow-sm"
                    >
                      {/* FIX: Bound native defaultChecked to the fetched React State */}
                      <Checkbox
                        id={mod.id}
                        name={mod.id}
                        defaultChecked={selectedModifiers.has(mod.id)}
                        className="mr-2"
                      />
                      <Label htmlFor={mod.id} className="font-bold cursor-pointer text-sm pr-1">
                        {mod.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="p-4 gap-3">
              <CardHeader className="p-0 border-b-2 border-border/50 space-y-0">
                <CardTitle className="flex items-center">
                  <ArrowUpRight className="w-5 h-5 mr-2" /> Trend Direction
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-wrap gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <div className="w-fit flex items-center p-2 bg-background rounded-lg hover:bg-accent hover:text-accent-foreground hover:translate-x-1 transition-transform border border-border ">
                    {/* FIX: Bound native defaultChecked to the fetched React State */}
                    <Checkbox id="trend_bull" name="trend_Bull" defaultChecked={selectedTrends.bull} className="mr-2" />
                    <Label htmlFor="trend_bull" className="font-bold flex items-center cursor-pointer text-sm pr-2">
                      <ArrowUpRight className="w-4 h-4 text-green-500 mr-2" /> Bullish (Long/Buy)
                    </Label>
                  </div>
                  <div className="w-fit flex items-center p-2 bg-background rounded-lg hover:bg-accent hover:text-accent-foreground hover:translate-x-1 transition-transform border border-border ">
                    {/* FIX: Bound native defaultChecked to the fetched React State */}
                    <Checkbox id="trend_bear" name="trend_Bear" defaultChecked={selectedTrends.bear} className="mr-2" />
                    <Label htmlFor="trend_bear" className="font-bold flex items-center cursor-pointer text-sm pr-2">
                      <ArrowDownRight className="w-4 h-4 text-destructive mr-2" /> Bearish (Short/Sell)
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAX-VISIBILITY Floating Save Button */}
          <div className="fixed bottom-10 right-4 sm:bottom-10 sm:right-10 z-[9999]">
            <button
              type="submit"
              className="flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-110 cursor-pointer outline-none m-0 border-none"
              style={{
                width: "64px",
                height: "64px",
                minWidth: "64px",
                minHeight: "64px",
                padding: "0",
                borderRadius: "50%",
              }}
              title="Save Changes"
            >
              <Save className="w-6 h-6" />
              <span className="sr-only">Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
