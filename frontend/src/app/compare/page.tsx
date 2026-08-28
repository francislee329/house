"use client";

import { useEffect, useState } from "react";
import { api, CompareItem, Listing, Estate } from "@/lib/api";
import { ValueScoreBadge } from "@/components/ValueScoreBadge";
import { formatPrice, formatPricePerSqft } from "@/lib/utils";

export default function ComparePage() {
  const [estates, setEstates] = useState<Estate[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [compared, setCompared] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getEstates(), api.getListings({ limit: 50 })])
      .then(([e, l]) => { setEstates(e); setAllListings(l.listings); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedIds.length >= 2) {
      api.compare(selectedIds).then((r) => setCompared(r.listings)).catch(console.error);
    } else {
      setCompared([]);
    }
  }, [selectedIds]);

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">單位比較</h1>
        <p className="text-zinc-500 text-sm">選擇 2-3 個單位進行比較 (已選 {selectedIds.length}/3)</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-500">載入中...</div>
      ) : (
        <>
          <div className="p-4 rounded-xl bg-[#13131a] border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="py-2 px-2 w-8"></th>
                    <th className="py-2 px-3 text-left">位置</th>
                    <th className="py-2 px-3 text-left">間隔</th>
                    <th className="py-2 px-3 text-right">面積</th>
                    <th className="py-2 px-3 text-right">售價</th>
                    <th className="py-2 px-3 text-right">呎價</th>
                    <th className="py-2 px-3 text-center">評分</th>
                  </tr>
                </thead>
                <tbody>
                  {allListings.slice(0, 30).map((l) => (
                    <tr
                      key={l.id}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition ${selectedIds.includes(l.id) ? "bg-blue-500/10" : ""}`}
                      onClick={() => toggle(l.id)}
                    >
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(l.id)}
                          onChange={() => toggle(l.id)}
                          className="rounded border-zinc-600"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-zinc-500 block">{l.estate_name}</span>
                        {l.phase} {l.block} {l.floor}{l.flat}室
                      </td>
                      <td className="py-2 px-3">{l.rooms}</td>
                      <td className="py-2 px-3 text-right">{l.area_sqft} 呎</td>
                      <td className="py-2 px-3 text-right font-medium">{formatPrice(l.price)}</td>
                      <td className="py-2 px-3 text-right text-zinc-400">{formatPricePerSqft(l.price_per_sqft)}</td>
                      <td className="py-2 px-3 text-center"><ValueScoreBadge score={l.value_score} showLabel={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {compared.length >= 2 && (
            <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
              <h2 className="font-bold mb-4">比較結果</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                      <th className="py-2 px-3 text-left">指標</th>
                      {compared.map((c) => (
                        <th key={c.id} className="py-2 px-3 text-center">{c.estate_name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow label="售價" values={compared.map((c) => formatPrice(c.price))} />
                    <CompareRow label="面積" values={compared.map((c) => `${c.area_sqft} 呎`)} />
                    <CompareRow label="呎價" values={compared.map((c) => formatPricePerSqft(c.price_per_sqft))} />
                    <CompareRow label="間隔" values={compared.map((c) => c.rooms)} />
                    <CompareRow label="樓層" values={compared.map((c) => `${c.floor} ${c.flat}室`)} />
                    <CompareRow label="地鐵步行" values={compared.map((c) => `${c.mtr_walk_minutes}分鐘`)} />
                    <CompareRow label="價值評分" values={compared.map((c) => c.value_score.toFixed(1))} highlight />
                    <CompareRow label="每月按揭" values={compared.map((c) => `$${c.monthly_mortgage.toLocaleString()}`)} />
                    <CompareRow label="估算租金" values={compared.map((c) => `$${c.estimated_rent.toLocaleString()}/月`)} />
                    <CompareRow label="租金回報" values={compared.map((c) => `${c.rental_yield}%`)} />
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompareRow({ label, values, highlight }: { label: string; values: string[]; highlight?: boolean }) {
  return (
    <tr className="border-b border-zinc-800/50">
      <td className="py-2 px-3 text-zinc-500">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`py-2 px-3 text-center ${highlight ? "font-bold text-blue-400" : ""}`}>{v}</td>
      ))}
    </tr>
  );
}
