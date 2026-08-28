"use client";

interface RiskFactors {
  maintenance_cost: string;
  noise_level: string;
  pest_risk: string;
  elevator_reliability: string;
  resale_difficulty: string;
}

interface Props {
  pros: string[];
  cons: string[];
  userComplaints: string[];
  riskFactors: RiskFactors;
}

const RISK_LABELS: Record<string, string> = {
  maintenance_cost: "維修成本",
  noise_level: "噪音程度",
  pest_risk: "蟲鼠風險",
  elevator_reliability: "電梯可靠性",
  resale_difficulty: "轉售難度",
};

const RISK_INVERTED = new Set(["elevator_reliability"]);

function getRiskColor(key: string, value: string): string {
  const isInverted = RISK_INVERTED.has(key);
  if (isInverted) {
    return value === "high" ? "text-emerald-400" : value === "medium" ? "text-amber-400" : "text-red-400";
  }
  return value === "low" ? "text-emerald-400" : value === "medium" ? "text-amber-400" : "text-red-400";
}

function getRiskBg(key: string, value: string): string {
  const isInverted = RISK_INVERTED.has(key);
  if (isInverted) {
    return value === "high" ? "bg-emerald-500/10 border-emerald-500/30" : value === "medium" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  }
  return value === "low" ? "bg-emerald-500/10 border-emerald-500/30" : value === "medium" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
}

const RISK_TEXT: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export default function CommunityFeedback({ pros, cons, userComplaints, riskFactors }: Props) {
  return (
    <div className="space-y-6">
      {/* 優缺點 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <h3 className="font-bold text-emerald-400 mb-3">優點</h3>
          <ul className="space-y-2">
            {pros.map((p, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">+</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <h3 className="font-bold text-red-400 mb-3">缺點</h3>
          <ul className="space-y-2">
            {cons.map((c, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-red-400 mt-0.5">-</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 用家投訴 */}
      <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-900/50">
        <h3 className="font-bold mb-3">用家真實反映</h3>
        <p className="text-xs text-zinc-500 mb-3">綜合 LIHKG 連登、香港討論區、親子王國等討論</p>
        <div className="flex flex-wrap gap-2">
          {userComplaints.map((c, i) => (
            <span key={i} className="px-3 py-1.5 text-xs rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* 風險評估 */}
      <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-900/50">
        <h3 className="font-bold mb-3">風險評估</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(riskFactors).map(([key, value]) => (
            <div key={key} className={`rounded-lg border p-3 text-center ${getRiskBg(key, value)}`}>
              <p className="text-xs text-zinc-500 mb-1">{RISK_LABELS[key]}</p>
              <p className={`font-bold ${getRiskColor(key, value)}`}>{RISK_TEXT[value]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
