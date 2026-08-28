"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { RoomGroup } from "@/lib/api";

interface Props {
  rooms: Record<string, RoomGroup>;
}

const COLORS: Record<string, string> = {
  "1房": "#f97316",
  "2房": "#3b82f6",
  "3房": "#10b981",
};

const MONTH_LABELS: Record<string, string> = {
  "01": "1月", "02": "2月", "03": "3月", "04": "4月",
  "05": "5月", "06": "6月", "07": "7月", "08": "8月",
  "09": "9月", "10": "10月", "11": "11月", "12": "12月",
};

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${y.slice(2)}年${MONTH_LABELS[mo] || mo}`;
}

export default function RoomTrendChart({ rooms }: Props) {
  const allMonths = [...new Set(
    Object.values(rooms).flatMap((g) => g.data.map((d) => d.month))
  )].sort();

  const merged = allMonths.map((month) => {
    const point: Record<string, string | number | null> = { month: fmtMonth(month) };
    for (const [roomType, group] of Object.entries(rooms)) {
      const found = group.data.find((d) => d.month === month);
      point[roomType] = found ? found.avg_price_per_sqft : null;
    }
    return point;
  });

  const allPrices = Object.values(rooms).flatMap((g) => g.data.map((d) => d.avg_price_per_sqft));
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const padding = (maxP - minP) * 0.15;
  const yMin = Math.floor((minP - padding) / 1000) * 1000;
  const yMax = Math.ceil((maxP + padding) / 1000) * 1000;

  return (
    <div className="space-y-6">
      <div className="flex gap-6 justify-center text-sm flex-wrap">
        {Object.entries(rooms).map(([roomType, group]) => (
          <div key={roomType} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[roomType] }}
            />
            <span className="text-zinc-400">{roomType}</span>
            <span className="font-bold" style={{ color: COLORS[roomType] }}>
              ${group.avg_price_per_sqft.toLocaleString()}/呎
            </span>
            <span className="text-zinc-600">({group.count}宗)</span>
          </div>
        ))}
      </div>

      <div className="w-full" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              domain={[yMin, yMax]}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              width={65}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "10px",
                fontSize: "13px",
                padding: "10px 14px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "#e4e4e7", fontWeight: "bold", marginBottom: 6 }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}/呎`,
                name,
              ]}
            />
            {Object.keys(rooms).map((roomType) => (
              <Line
                key={roomType}
                type="monotone"
                dataKey={roomType}
                stroke={COLORS[roomType]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLORS[roomType], strokeWidth: 0 }}
                activeDot={{ r: 6, fill: COLORS[roomType], stroke: "#18181b", strokeWidth: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Object.entries(rooms).map(([roomType, group]) => {
          const ratio = group.yield_to_mortgage_ratio;
          const isGood = ratio >= 1;
          return (
            <div
              key={roomType}
              className="rounded-lg border p-3 text-center"
              style={{
                borderColor: isGood ? "#10b981" : "#ef4444",
                backgroundColor: isGood ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              }}
            >
              <p className="text-sm text-zinc-400">{roomType}</p>
              <p className="text-lg font-bold" style={{ color: isGood ? "#10b981" : "#ef4444" }}>
                {isGood ? "正" : "負"}
              </p>
              <div className="mt-1 text-xs text-zinc-500 space-y-0.5">
                <p>租金回報率: <span className="text-zinc-300">{group.rental_yield_pct}%</span></p>
                <p>按揭利率: <span className="text-zinc-300">{group.mortgage_rate_pct}%</span></p>
                <p className="font-medium" style={{ color: isGood ? "#10b981" : "#ef4444" }}>
                  回報/利率: {ratio}x
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
