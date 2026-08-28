"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Estate, Transaction, RoomGroup } from "@/lib/api";
import PriceChart from "@/components/PriceChart";
import RoomTrendChart from "@/components/RoomTrendChart";
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
            const t = await api.getTransactions(member.id);
            allTxns.push(...t.transactions.map(tx => ({ ...tx, estate_name: member.name })));
          }
          setTransactions(allTxns.sort((a, b) => b.date.localeCompare(a.date)));
        } else {
          const t = await api.getTransactions(id);
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
          <PriceChart data={estate.price_history} height={350} />
        </div>
      )}

      {roomData && Object.keys(roomData).length > 0 && (
        <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
          <h2 className="font-bold mb-1">各間隔走勢</h2>
          <p className="text-sm text-zinc-500 mb-4">按間隔分類 — 租金回報 vs 按揭利率</p>
          <RoomTrendChart rooms={roomData} />
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
            <PriceChart data={estate.price_history} height={350} />
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
              <Row label="發展商" value={estate.developer} />
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

      {roomData && Object.keys(roomData).length > 0 && (
        <div className="p-5 rounded-xl bg-[#13131a] border border-zinc-800">
          <h2 className="font-bold mb-1">各間隔走勢</h2>
          <p className="text-sm text-zinc-500 mb-4">按間隔分類 — 租金回報 vs 按揭利率</p>
          <RoomTrendChart rooms={roomData} />
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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#13131a] border border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
