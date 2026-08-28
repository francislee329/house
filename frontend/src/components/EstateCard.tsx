"use client";

import Link from "next/link";
import { Estate } from "@/lib/api";
import { formatPricePerSqft } from "@/lib/utils";

interface Props {
  estate: Estate;
}

export default function EstateCard({ estate }: Props) {
  const meta: Record<number, { color: string; emoji: string }> = {
    1: { color: "from-blue-600 to-blue-800", emoji: "🏙️" },
    2: { color: "from-purple-600 to-purple-800", emoji: "🌇" },
    3: { color: "from-emerald-600 to-emerald-800", emoji: "🌳" },
    4: { color: "from-amber-600 to-amber-800", emoji: "🏔️" },
    100: { color: "from-red-600 to-orange-600", emoji: "🐉" },
  };
  const m = meta[estate.id] || { color: "from-zinc-600 to-zinc-800", emoji: "🏠" };

  return (
    <Link href={`/estate/${estate.id}`}>
      <div className="group relative rounded-xl border border-zinc-800 bg-[#13131a] p-5 hover:border-zinc-600 transition-all hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer">
        <div className={`absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r ${m.color}`} />
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{estate.name}</h3>
              {estate.is_group && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  4屋苑
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">{estate.name_en}</p>
          </div>
          <span className="text-2xl">{m.emoji}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-zinc-500">地區</span>
            <p className="font-medium">{estate.district}</p>
          </div>
          <div>
            <span className="text-zinc-500">最近地鐵</span>
            <p className="font-medium">{estate.nearest_mtr} ({estate.mtr_walk_minutes}分鐘)</p>
          </div>
          <div>
            <span className="text-zinc-500">平均呎價</span>
            <p className="font-bold text-blue-400">{formatPricePerSqft(estate.avg_price_per_sqft)}</p>
          </div>
          <div>
            <span className="text-zinc-500">{estate.is_group ? "屋苑數" : "30日成交"}</span>
            <p className="font-medium">{estate.is_group ? "4 個" : `${estate.transaction_count_30d || 0} 宗`}</p>
          </div>
          <div>
            <span className="text-zinc-500">單位數</span>
            <p className="font-medium">{estate.total_units.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-zinc-500">屋齡</span>
            <p className="font-medium">{estate.building_age_years}年</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>校網 {estate.school_net}</span>
          <span className="group-hover:text-blue-400 transition">查看詳情 →</span>
        </div>
      </div>
    </Link>
  );
}
