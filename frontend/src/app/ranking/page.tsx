"use client";

import { useEffect, useState } from "react";
import { api, RankedListing } from "@/lib/api";
import { ValueScoreBadge, ScoreBreakdownChart } from "@/components/ValueScoreBadge";
import { formatPrice, formatPricePerSqft } from "@/lib/utils";

export default function RankingPage() {
  const [ranked, setRanked] = useState<RankedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    api.getRanking({ limit: 30 })
      .then((r) => setRanked(r.ranked))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">筍盤排名</h1>
        <p className="text-zinc-500 text-sm">按價值評分排序，最佳投資/自住選擇</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-500">載入中...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="py-2 px-3 text-center">#</th>
                    <th className="py-2 px-3 text-left">位置</th>
                    <th className="py-2 px-3 text-left">間隔</th>
                    <th className="py-2 px-3 text-right">實用面積</th>
                    <th className="py-2 px-3 text-right">售價</th>
                    <th className="py-2 px-3 text-right">呎價</th>
                    <th className="py-2 px-3 text-center">評分</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r, i) => (
                    <tr
                      key={r.listing_id}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition ${selected === r.listing_id ? "bg-blue-500/10" : ""}`}
                      onClick={() => setSelected(selected === r.listing_id ? null : r.listing_id)}
                    >
                      <td className="py-3 px-3 text-center">
                        <span className={`text-sm font-bold ${i < 3 ? "text-amber-400" : "text-zinc-500"}`}>#{i + 1}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-zinc-500 block">{r.estate_name}</span>
                        <span className="text-sm">{r.address}</span>
                      </td>
                      <td className="py-3 px-3 text-sm">{r.rooms}</td>
                      <td className="py-3 px-3 text-sm text-right">{r.area_sqft} 呎</td>
                      <td className="py-3 px-3 text-sm text-right font-medium">{formatPrice(r.price)}</td>
                      <td className="py-3 px-3 text-sm text-right text-zinc-400">{formatPricePerSqft(r.price_per_sqft)}</td>
                      <td className="py-3 px-3 text-center"><ValueScoreBadge score={r.value_score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-1">
            {selected ? (
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800 sticky top-20">
                <h3 className="font-bold mb-4">評分明細</h3>
                {(() => {
                  const item = ranked.find((r) => r.listing_id === selected);
                  if (!item) return null;
                  return (
                    <>
                      <div className="mb-4">
                        <p className="text-sm text-zinc-400">{item.estate_name}</p>
                        <p className="font-medium">{item.address}</p>
                        <p className="text-sm text-zinc-400">{item.rooms} · {item.area_sqft}呎 · {formatPrice(item.price)}</p>
                      </div>
                      <ScoreBreakdownChart breakdown={item.score_breakdown} />
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800 text-center text-zinc-500 text-sm">
                點擊排名行查看評分明細
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
