"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Package, AlertTriangle, XCircle, RefreshCw, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Custom tooltip for bar chart
function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ["Niedziela", "Poniedzialek", "Wtorek", "Sroda", "Czwartek", "Piatek", "Sobota"];
    return {
      day: dayNames[date.getDay()],
      date: `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`,
    };
  };

  const dateInfo = formatDate(label || "");
  const added = payload.find(p => p.dataKey === "added")?.value || 0;
  const removed = payload.find(p => p.dataKey === "removed")?.value || 0;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl p-4 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="text-xs text-muted-foreground mb-1">{dateInfo.day}</div>
      <div className="font-semibold text-sm mb-3">{dateInfo.date}</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
            <span className="text-sm text-muted-foreground">Dodane</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span className="font-semibold text-green-600">+{added}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="text-sm text-muted-foreground">Zuzycie</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <span className="font-semibold text-red-600">-{removed}</span>
          </div>
        </div>
      </div>
      {added > 0 || removed > 0 ? (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Bilans</span>
            <span className={`font-semibold ${added - removed >= 0 ? "text-green-600" : "text-red-600"}`}>
              {added - removed >= 0 ? "+" : ""}{added - removed}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Custom tooltip for pie chart
function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl p-4 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shadow-sm"
          style={{ backgroundColor: data.payload.fill, boxShadow: `0 0 8px ${data.payload.fill}40` }}
        />
        <span className="font-semibold text-sm">{data.name}</span>
      </div>
      <div className="text-2xl font-bold">{data.value}</div>
      <div className="text-xs text-muted-foreground">produktow</div>
    </div>
  );
}

interface ConsumptionDay {
  date: string;
  added: number;
  removed: number;
}

interface CategoryStat {
  name: string;
  count: number;
  icon: string | null;
  [key: string]: string | number | null;
}

interface Stats {
  consumption: ConsumptionDay[];
  categories: CategoryStat[];
  summary: {
    totalItems: number;
    expiringCount: number;
    expiredCount: number;
  };
}

const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
];

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    // Only show full skeleton on initial load
    if (!stats) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await fetch(`/api/stats?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  // Only show skeleton on initial load when there's no data
  if (initialLoading && !stats) {
    return (
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrot
          </Link>
          <button
            onClick={fetchStats}
            disabled={isRefreshing}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted disabled:opacity-50"
            title="Odswiez"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <h1 className="text-2xl font-bold">Statystyki</h1>
        <p className="text-muted-foreground mt-1">
          Analiza zuzycia i stanu inwentarza
        </p>
      </header>

      {/* Summary cards */}
      {stats && (
        <div className={`grid grid-cols-3 gap-3 mb-6 transition-opacity duration-200 ${isRefreshing ? "opacity-60" : ""}`}>
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">W magazynie</span>
            </div>
            <p className="text-2xl font-bold">{stats.summary.totalItems}</p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Wygasa</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {stats.summary.expiringCount}
            </p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs">Przeterminowane</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {stats.summary.expiredCount}
            </p>
          </div>
        </div>
      )}

      {/* Time range selector */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {d} dni
          </button>
        ))}
      </div>

      {/* Consumption chart */}
      <div className={`p-4 bg-card rounded-lg border mb-6 transition-opacity duration-200 ${isRefreshing ? "opacity-60" : ""}`}>
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Aktywnosc w ostatnich {days} dniach
        </h2>
        {stats && stats.consumption.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.consumption} barCategoryGap="20%">
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
                <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={false}
              />
              <Bar
                dataKey="added"
                name="Dodane"
                fill="url(#greenGradient)"
                radius={[6, 6, 0, 0]}
                className="drop-shadow-sm"
                activeBar={{
                  fill: "#4ade80",
                  stroke: "#22c55e",
                  strokeWidth: 2,
                  filter: "drop-shadow(0 4px 6px rgba(34, 197, 94, 0.4))",
                }}
              />
              <Bar
                dataKey="removed"
                name="Zuzycie"
                fill="url(#redGradient)"
                radius={[6, 6, 0, 0]}
                className="drop-shadow-sm"
                activeBar={{
                  fill: "#f87171",
                  stroke: "#ef4444",
                  strokeWidth: 2,
                  filter: "drop-shadow(0 4px 6px rgba(239, 68, 68, 0.4))",
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Brak danych za ten okres
          </div>
        )}
      </div>

      {/* Categories chart */}
      <div className={`p-4 bg-card rounded-lg border transition-opacity duration-200 ${isRefreshing ? "opacity-60" : ""}`}>
        <h2 className="font-medium mb-4">Produkty wg kategorii</h2>
        {stats && stats.categories.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.categories}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={false}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {stats.categories.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Brak produktow w inwentarzu
          </div>
        )}
      </div>
    </main>
  );
}
