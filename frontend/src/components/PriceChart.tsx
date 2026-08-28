"use client";

import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PriceHistoryPoint } from "@/lib/api";

interface Props {
  data: PriceHistoryPoint[];
  height?: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "1月", "02": "2月", "03": "3月", "04": "4月",
  "05": "5月", "06": "6月", "07": "7月", "08": "8月",
  "09": "9月", "10": "10月", "11": "11月", "12": "12月",
};

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${y.slice(2)}年${MONTH_LABELS[mo] || mo}`;
}

export default function PriceChart({ data, height = 300 }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: fmtMonth(d.month),
  }));

  const prices = data.map((d) => d.avg_price_per_sqft);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const padding = (maxP - minP) * 0.15;
  const yMin = Math.floor((minP - padding) / 1000) * 1000;
  const yMax = Math.ceil((maxP + padding) / 1000) * 1000;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formatted} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="price"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            domain={[yMin, yMax]}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            width={65}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
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
            formatter={(value: number, name: string) =>
              name === "avg_price_per_sqft" ? [`$${value.toLocaleString()}/呎`, "呎價"] : [value, "成交量"]
            }
          />
          <Bar yAxisId="volume" dataKey="volume" fill="#27272a" radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="avg_price_per_sqft"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#3b82f6", stroke: "#18181b", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
