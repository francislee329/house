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
        <p className="text-zinc-500 text-sm">選擇 2-3 個單位進行比較 — 參考胡說樓市四大考慮</p>
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
                    <th className="py-2 px-3 text-right">實用面積</th>
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
            <div className="space-y-6">
              {/* 1. 基本資料 */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-4">基本資料</h2>
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
                      <CompareRow label="實用面積" values={compared.map((c) => `${c.area_sqft} 呎`)} />
                      <CompareRow label="呎價" values={compared.map((c) => formatPricePerSqft(c.price_per_sqft))} />
                      <CompareRow label="間隔" values={compared.map((c) => c.rooms)} />
                      <CompareRow label="樓層" values={compared.map((c) => `${c.floor} ${c.flat}室`)} />
                      <CompareRow label="地鐵步行" values={compared.map((c) => `${c.mtr_walk_minutes}分鐘`)} />
                      <CompareRow label="價值評分" values={compared.map((c) => c.value_score.toFixed(1))} highlight />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. 現金流分析 (胡說樓市考慮1) */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-2">現金流分析</h2>
                <p className="text-sm text-zinc-500 mb-4">參考：胡說樓市「租金回報 vs 按揭利率」</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {compared.map((c) => {
                    const cf = c.cash_flow;
                    return (
                      <div key={c.id} className={`rounded-lg border p-4 ${cf.is_positive_cashflow ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                        <p className="text-sm font-medium mb-3">{c.estate_name}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">月租收入</span>
                            <span className="font-medium">${cf.estimated_monthly_rent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">月供支出</span>
                            <span className="font-medium text-red-400">-${cf.monthly_mortgage.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-zinc-800 pt-2 flex justify-between">
                            <span className="text-zinc-500">淨現金流</span>
                            <span className={`font-bold ${cf.net_monthly_cashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {cf.net_monthly_cashflow >= 0 ? "+" : ""}{cf.net_monthly_cashflow.toLocaleString()}/月
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">年回報率</span>
                            <span className="font-medium">{cf.annual_yield_pct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">回報/利率</span>
                            <span className={`font-bold ${cf.yield_vs_mortgage >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                              {cf.yield_vs_mortgage}x
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. 壓力測試 (胡說樓市考慮2) */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-2">壓力測試</h2>
                <p className="text-sm text-zinc-500 mb-4">參考：胡說樓市「置業前先做壓力測試」— 失業半年能否負擔？</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {compared.map((c) => {
                    const st = c.stress_test;
                    return (
                      <div key={c.id} className={`rounded-lg border p-4 ${st.passes_stress_test ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                        <p className="text-sm font-medium mb-3">{c.estate_name}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">月供</span>
                            <span className="font-medium">${st.monthly_mortgage.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">失業月份</span>
                            <span className="font-medium">{st.months_unemployed} 個月</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">所需儲蓄</span>
                            <span className="font-bold text-amber-400">${st.savings_needed.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-zinc-800 pt-2 flex justify-between">
                            <span className="text-zinc-500">租金能否覆蓋</span>
                            <span className={st.rent_covers_mortgage ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                              {st.rent_covers_mortgage ? "能" : "不能"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">壓力測試</span>
                            <span className={`font-bold ${st.passes_stress_test ? "text-emerald-400" : "text-red-400"}`}>
                              {st.passes_stress_test ? "通過" : "不通過"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. 買樓雜費 (胡說樓市考慮3) */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-2">買樓雜費</h2>
                <p className="text-sm text-zinc-500 mb-4">參考：胡說樓市「買樓雜費」— 首期外要預多少？</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                        <th className="py-2 px-3 text-left">費用項目</th>
                        {compared.map((c) => (
                          <th key={c.id} className="py-2 px-3 text-center">{c.estate_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <CompareRow label="印花稅 (2.25%)" values={compared.map((c) => `$${c.transaction_costs.stamp_duty.toLocaleString()}`)} />
                      <CompareRow label="經紀佣金 (1%)" values={compared.map((c) => `$${c.transaction_costs.agent_fee.toLocaleString()}`)} />
                      <CompareRow label="律師費" values={compared.map((c) => `$${c.transaction_costs.lawyer_fee.toLocaleString()}`)} />
                      <CompareRow label="總雜費" values={compared.map((c) => `$${c.transaction_costs.total_upfront_cost.toLocaleString()}`)} highlight />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. 銀行估價 (胡說樓市考慮4) */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-2">銀行估價</h2>
                <p className="text-sm text-zinc-500 mb-4">參考：胡說樓市「留意銀行估價」— 估唔足要抬錢</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {compared.map((c) => {
                    const bv = c.bank_valuation;
                    return (
                      <div key={c.id} className="rounded-lg border border-zinc-700 p-4">
                        <p className="text-sm font-medium mb-3">{c.estate_name}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">估價</span>
                            <span className="font-medium">${bv.estimated_value.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">最高按揭成數</span>
                            <span className="font-medium">{bv.lenders_ltv}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">最高貸款額</span>
                            <span className="font-medium">${bv.max_loan.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-zinc-800 pt-2 flex justify-between">
                            <span className="text-zinc-500">最低首期</span>
                            <span className="font-bold text-amber-400">${bv.min_downpayment.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. 投資評分 */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-4">投資評分</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {compared.map((c) => {
                    const inv = c.investment_score;
                    const scoreColor = inv.score >= 70 ? "text-emerald-400" : inv.score >= 50 ? "text-amber-400" : "text-red-400";
                    return (
                      <div key={c.id} className="rounded-lg border border-zinc-700 p-4 text-center">
                        <p className="text-sm font-medium mb-2">{c.estate_name}</p>
                        <p className={`text-4xl font-bold ${scoreColor}`}>{inv.score}</p>
                        <p className="text-sm text-zinc-500 mt-1">{inv.verdict}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 7. 屋苑優缺點 + 風險評估 */}
              <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
                <h2 className="font-bold mb-2">屋苑優缺點</h2>
                <p className="text-sm text-zinc-500 mb-4">綜合分析 — 尋視點、LIHKG、香港討論區、胡說樓市</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {compared.map((c) => (
                    <div key={c.id} className="rounded-lg border border-zinc-700 p-4">
                      <p className="text-sm font-medium mb-3">{c.estate_name}</p>
                      <div className="space-y-3 text-sm">
                        {c.estate_pros && c.estate_pros.length > 0 && (
                          <div>
                            <p className="text-emerald-400 font-medium mb-1">優點</p>
                            <ul className="space-y-1">
                              {c.estate_pros.slice(0, 3).map((p, i) => (
                                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                                  <span className="text-emerald-400">+</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {c.estate_cons && c.estate_cons.length > 0 && (
                          <div>
                            <p className="text-red-400 font-medium mb-1">缺點</p>
                            <ul className="space-y-1">
                              {c.estate_cons.slice(0, 3).map((con, i) => (
                                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                                  <span className="text-red-400">-</span>{con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {c.risk_factors && (
                          <div className="pt-2 border-t border-zinc-800">
                            <p className="text-xs text-zinc-500 mb-1">風險評估</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(c.risk_factors).map(([key, value]) => {
                                const isInverted = key === 'elevator_reliability';
                                const isGood = isInverted ? value === 'high' : value === 'low';
                                const isBad = isInverted ? value === 'low' : value === 'high';
                                return (
                                  <span key={key} className={`px-1.5 py-0.5 text-[10px] rounded ${
                                    isGood ? 'bg-emerald-500/20 text-emerald-400' :
                                    isBad ? 'bg-red-500/20 text-red-400' :
                                    'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {key === 'maintenance_cost' ? '維修' :
                                     key === 'noise_level' ? '噪音' :
                                     key === 'pest_risk' ? '蟲鼠' :
                                     key === 'elevator_reliability' ? '電梯' : '轉售'}
                                    : {value === 'low' ? '低' : value === 'medium' ? '中' : '高'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
