"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Area } from "recharts";

interface TrendPoint {
  month: string;
  avg_price_per_sqft: number;
  volume: number;
}

interface Props {
  data: TrendPoint[];
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

export default function EstateTrendChart({ data, height = 350 }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: fmtMonth(d.month),
  }));

  const prices = data.map((d) => d.avg_price_per_sqft);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const padding = (maxP - minP) * 0.15;
  const yMin = Math.floor((minP - padding) / 1000) * 1000;
  const yMax = Math.ceil((maxP + padding) / 1000) * 1000;

  const maxVol = Math.max(...data.map((d) => d.volume));

  const avgPsf = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const latestPsf = prices[prices.length - 1] || 0;
  const prevPsf = prices[prices.length - 2] || latestPsf;
  const change = prevPsf > 0 ? ((latestPsf - prevPsf) / prevPsf * 100).toFixed(1) : "0";
  const changeNum = parseFloat(change);

  return (
    <div className="space-y-4">
      <div className="flex gap-6 flex-wrap">
        <div>
          <span className="text-xs text-zinc-500">最新平均呎價</span>
          <p className="text-xl font-bold text-blue-400">${latestPsf.toLocaleString()}/呎</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">歷史平均</span>
          <p className="text-xl font-bold text-zinc-300">${avgPsf.toLocaleString()}/呎</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">按月變化</span>
          <p className={`text-xl font-bold ${changeNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {changeNum >= 0 ? "+" : ""}{change}%
          </p>
        </div>
      </div>

      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
              angle={-45}
              textAnchor="end"
              height={50}
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
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              domain={[0, maxVol * 1.2]}
              width={40}
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
              formatter={(value: number, name: string) => {
                if (name === "avg_price_per_sqft") return [`$${value.toLocaleString()}/呎`, "平均呎價"];
                return [`${value}宗`, "成交量"];
              }}
            />
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#334155"
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="avg_price_per_sqft"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#3b82f6", stroke: "#18181b", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
