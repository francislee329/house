"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Estate, Transaction, RoomGroup } from "@/lib/api";
import EstateTrendChart from "@/components/EstateTrendChart";
import CommunityFeedback from "@/components/CommunityFeedback";
import DeveloperBadge from "@/components/DeveloperBadge";
import { formatPrice, formatPricePerSqft } from "@/lib/utils";

export default function EstateDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [roomData, setRoomData] = useState<Record<string, RoomGroup> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const e = await api.getEstate(id);
        setEstate(e);

        if (e.is_group && e.members) {
          const allTxns: Transaction[] = [];
          for (const member of e.members) {
            const t = await api.getTransactions(member.id, 200);
            allTxns.push(...t.transactions.map(tx => ({ ...tx, estate_name: member.name })));
          }
          setTransactions(allTxns.sort((a, b) => b.date.localeCompare(a.date)));
        } else {
          const t = await api.getTransactions(id, 200);
          setTransactions(t.transactions);
        }

        const r = await api.getTransactionsByRoomEstate(id);
        setRoomData(r.rooms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="text-center py-10 text-zinc-500">載入中...</div>;
  if (!estate) return <div className="text-center py-10 text-zinc-500">找不到屋苑</div>;

  if (estate.is_group && estate.members) {
    return <GroupEstateDetail estate={estate} members={estate.members} transactions={transactions} roomData={roomData} />;
  }

  return <SingleEstateDetail estate={estate} transactions={transactions} roomData={roomData} />;
}

function GroupEstateDetail({ estate, members, transactions, roomData }: { estate: Estate; members: Estate[]; transactions: Transaction[]; roomData: Record<string, RoomGroup> | null }) {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition">← 返回屋苑</Link>
        <h1 className="text-3xl font-bold mt-2">{estate.name}</h1>
        <p className="text-zinc-500">{estate.name_en} · {estate.district}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="平均呎價" value={formatPricePerSqft(estate.avg_price_per_sqft)} color="text-blue-400" />
        <StatCard label="追蹤屋苑" value={`${members.length} 個`} color="text-emerald-400" />
        <StatCard label="總單位" value={estate.total_units.toLocaleString()} color="text-amber-400" />
        <StatCard label="屋齡" value={`${estate.building_age_years}年`} color="text-purple-400" />
      </div>

      <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
        <h2 className="font-bold mb-4">屋苑比較</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="py-2 px-3 text-left">屋苑</th>
                <th className="py-2 px-3 text-right">平均呎價</th>
                <th className="py-2 px-3 text-right">最低</th>
                <th className="py-2 px-3 text-right">最高</th>
                <th className="py-2 px-3 text-right">放盤</th>
                <th className="py-2 px-3 text-right">成交</th>
                <th className="py-2 px-3 text-left">地鐵</th>
                <th className="py-2 px-3 text-left">發展商</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-3">
                    <Link href={`/estate/${m.id}`} className="font-medium hover:text-blue-400 transition">
                      {m.name}
                    </Link>
                    <p className="text-xs text-zinc-500">{m.name_en}</p>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-blue-400">{formatPricePerSqft(m.avg_price_per_sqft)}</td>
                  <td className="py-3 px-3 text-right text-zinc-400">{formatPricePerSqft(m.price_range?.min || 0)}</td>
                  <td className="py-3 px-3 text-right text-zinc-400">{formatPricePerSqft(m.price_range?.max || 0)}</td>
                  <td className="py-3 px-3 text-right">{m.listing_count || 0}</td>
                  <td className="py-3 px-3 text-right">{m.transaction_count_30d || 0}</td>
                  <td className="py-3 px-3 text-sm">{m.nearest_mtr} ({m.mtr_walk_minutes}分鐘)</td>
                  <td className="py-3 px-3 text-sm text-zinc-400">{m.developer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {estate.price_history && estate.price_history.length > 0 && (
        <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
          <h2 className="font-bold mb-4">歷史呎價走勢（合併）</h2>
          <EstateTrendChart data={estate.price_history} height={350} />
        </div>
      )}

      {roomData && (
        <RentalYieldCard roomData={roomData} />
      )}

      {estate.pros && estate.cons && estate.user_complaints && estate.risk_factors && (
        <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
          <h2 className="font-bold mb-2">屋苑評價</h2>
          <p className="text-sm text-zinc-500 mb-4">綜合分析 — 尋視點、LIHKG、香港討論區、胡說樓市</p>
          <CommunityFeedback
            pros={estate.pros}
            cons={estate.cons}
            userComplaints={estate.user_complaints}
            riskFactors={estate.risk_factors}
          />
        </div>
      )}

      <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
        <h2 className="font-bold mb-4">近期成交（全部屋苑）</h2>
        {transactions.length === 0 ? (
          <p className="text-zinc-500 text-sm">無成交紀錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 px-3 text-left">日期</th>
                  <th className="py-2 px-3 text-left">屋苑</th>
                  <th className="py-2 px-3 text-left">位置</th>
                  <th className="py-2 px-3 text-left">間隔</th>
                  <th className="py-2 px-3 text-right">實用面積</th>
                  <th className="py-2 px-3 text-right">售價</th>
                  <th className="py-2 px-3 text-right">呎價</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 30).map((t, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-3 text-zinc-400">{t.date}</td>
                    <td className="py-2 px-3 text-zinc-400">{(t as any).estate_name}</td>
                    <td className="py-2 px-3">{t.phase} {t.block} {t.floor}{t.flat}室</td>
                    <td className="py-2 px-3">{t.rooms}</td>
                    <td className="py-2 px-3 text-right">{t.area_sqft} 呎</td>
                    <td className="py-2 px-3 text-right font-medium">{formatPrice(t.price)}</td>
                    <td className="py-2 px-3 text-right text-zinc-400">{formatPricePerSqft(t.price_per_sqft)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SingleEstateDetail({ estate, transactions, roomData }: { estate: Estate; transactions: Transaction[]; roomData: Record<string, RoomGroup> | null }) {
  const facilities: Record<string, string> = {
    swimming_pool: "泳池", gym: "健身室", playground: "遊樂場",
    shopping_centre: "商場", tennis_court: "網球場", garden: "花園",
    sports_centre: "運動中心",
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition">← 返回屋苑</Link>
        <h1 className="text-3xl font-bold mt-2">{estate.name}</h1>
        <p className="text-zinc-500">{estate.name_en} · {estate.district}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="平均呎價" value={formatPricePerSqft(estate.avg_price_per_sqft)} color="text-blue-400" />
        <StatCard label="最低呎價" value={formatPricePerSqft(estate.price_range?.min || 0)} color="text-emerald-400" />
        <StatCard label="最高呎價" value={formatPricePerSqft(estate.price_range?.max || 0)} color="text-amber-400" />
        <StatCard label="30日成交" value={`${estate.transaction_count_30d || 0} 宗`} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#13131a] border border-zinc-800">
          <h2 className="font-bold mb-4">歷史呎價走勢</h2>
          {estate.price_history && estate.price_history.length > 0 ? (
            <EstateTrendChart data={estate.price_history} height={350} />
          ) : (
            <p className="text-zinc-500 text-sm">無歷史數據</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
            <h2 className="font-bold mb-3">基本資料</h2>
            <div className="space-y-2 text-sm">
              <Row label="最近地鐵" value={`${estate.nearest_mtr} (${estate.mtr_walk_minutes}分鐘)`} />
              <Row label="總單位" value={estate.total_units.toLocaleString()} />
              <Row label="屋齡" value={`${estate.building_age_years}年`} />
              <div className="flex justify-between items-start">
                <span className="text-zinc-500">發展商</span>
                <DeveloperBadge developer={estate.developer} info={estate.developer_info} showDescription />
              </div>
              <Row label="校網" value={estate.school_net} />
              <Row label="期數" value={`${estate.phases}期`} />
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
            <h2 className="font-bold mb-3">設施</h2>
            <div className="flex flex-wrap gap-2">
              {estate.facilities.map((f) => (
                <span key={f} className="px-2 py-1 text-xs rounded-md bg-zinc-800 text-zinc-300">
                  {facilities[f] || f}
                </span>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
            <h2 className="font-bold mb-3">間隔</h2>
            <div className="flex flex-wrap gap-2">
              {estate.unit_layouts.map((l) => (
                <span key={l} className="px-2 py-1 text-xs rounded-md bg-zinc-800 text-zinc-300">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {roomData && (
        <RentalYieldCard roomData={roomData} />
      )}

      {estate.pros && estate.cons && estate.user_complaints && estate.risk_factors && (
        <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
          <h2 className="font-bold mb-2">屋苑評價</h2>
          <p className="text-sm text-zinc-500 mb-4">綜合分析 — 尋視點、LIHKG、香港討論區、胡說樓市</p>
          <CommunityFeedback
            pros={estate.pros}
            cons={estate.cons}
            userComplaints={estate.user_complaints}
            riskFactors={estate.risk_factors}
          />
        </div>
      )}

      <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
        <h2 className="font-bold mb-4">近期成交</h2>
        {transactions.length === 0 ? (
          <p className="text-zinc-500 text-sm">無成交紀錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 px-3 text-left">日期</th>
                  <th className="py-2 px-3 text-left">位置</th>
                  <th className="py-2 px-3 text-left">間隔</th>
                  <th className="py-2 px-3 text-right">實用面積</th>
                  <th className="py-2 px-3 text-right">售價</th>
                  <th className="py-2 px-3 text-right">呎價</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((t, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-3 text-zinc-400">{t.date}</td>
                    <td className="py-2 px-3">{t.phase} {t.block} {t.floor}{t.flat}室</td>
                    <td className="py-2 px-3">{t.rooms}</td>
                    <td className="py-2 px-3 text-right">{t.area_sqft} 呎</td>
                    <td className="py-2 px-3 text-right font-medium">{formatPrice(t.price)}</td>
                    <td className="py-2 px-3 text-right text-zinc-400">{formatPricePerSqft(t.price_per_sqft)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RentalYieldCard({ roomData }: { roomData: Record<string, RoomGroup> }) {
  const MORTGAGE_RATE = 3.5;

  const entries = Object.entries(roomData).filter(([, g]) => g.count > 0);
  if (entries.length === 0) return null;

  const avgRatio = entries.reduce((sum, [, g]) => sum + g.yield_to_mortgage_ratio, 0) / entries.length;
  const isGood = avgRatio >= 1;

  return (
    <div className="p-5 rounded-xl border" style={{
      borderColor: isGood ? "#10b981" : "#ef4444",
      backgroundColor: isGood ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)",
    }}>
      <h2 className="font-bold mb-3">投資回報分析</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {entries.map(([roomType, group]) => {
          const ratio = group.yield_to_mortgage_ratio;
          const good = ratio >= 1;
          return (
            <div key={roomType} className="rounded-lg border p-3" style={{
              borderColor: good ? "#10b981" : "#ef4444",
              backgroundColor: good ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            }}>
              <p className="text-sm text-zinc-400">{roomType}</p>
              <p className="text-lg font-bold" style={{ color: good ? "#10b981" : "#ef4444" }}>
                {ratio}x
              </p>
              <div className="mt-1 text-xs text-zinc-500 space-y-0.5">
                <p>回報: <span className="text-zinc-300">{group.rental_yield_pct}%</span></p>
                <p>按揭: <span className="text-zinc-300">{MORTGAGE_RATE}%</span></p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        平均回報/利率比: <span className="font-bold" style={{ color: isGood ? "#10b981" : "#ef4444" }}>{avgRatio.toFixed(2)}x</span>
        {isGood ? " — 回報高於按揭，值得考慮" : " — 回報低於按揭，投資需謹慎"}
      </p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#13131a] border border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
