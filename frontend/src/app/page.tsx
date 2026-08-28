import { api, Estate, RoomGroup } from "@/lib/api";
import EstateCard from "@/components/EstateCard";
import RoomTrendChart from "@/components/RoomTrendChart";

export const dynamic = "force-dynamic";

export default async function Home() {
  let estates: Estate[] = [];
  let roomData: Record<string, RoomGroup> = {};
  try {
    [estates, roomData] = await Promise.all([
      api.getEstates(),
      api.getTransactionsByRoom(),
    ]);
  } catch {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-lg">無法連接 API</p>
        <p className="text-sm mt-2">請確認後端已啟動 (uv run uvicorn src.api.main:app --port 8000)</p>
      </div>
    );
  }

  const MEMBER_ESTATE_IDS = [5, 6, 7, 8];
  const displayEstates = estates.filter(e => !MEMBER_ESTATE_IDS.includes(e.id));

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-blue-400">HK</span> Flat Value Finder
        </h1>
        <p className="text-zinc-500">荔枝角四小龍 — 找出最筍的單位</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayEstates.map((estate) => (
          <EstateCard key={estate.id} estate={estate} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl bg-[#13131a] border border-zinc-800">
          <p className="text-2xl font-bold text-blue-400">{displayEstates.reduce((s, e) => s + (e.transaction_count_30d || 0), 0)}</p>
          <p className="text-xs text-zinc-500 mt-1">30日總成交</p>
        </div>
        <div className="p-4 rounded-xl bg-[#13131a] border border-zinc-800">
          <p className="text-2xl font-bold text-emerald-400">
            {Math.round(displayEstates.reduce((s, e) => s + e.avg_price_per_sqft, 0) / displayEstates.length).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">平均呎價</p>
        </div>
        <div className="p-4 rounded-xl bg-[#13131a] border border-zinc-800">
          <p className="text-2xl font-bold text-amber-400">{displayEstates.length}</p>
          <p className="text-xs text-zinc-500 mt-1">追蹤屋苑</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#13131a] border border-zinc-800 p-6">
        <h2 className="text-xl font-bold mb-1">最近成交走勢</h2>
        <p className="text-sm text-zinc-500 mb-4">按間隔分類 — 各類型平均呎價趨勢</p>
        <RoomTrendChart rooms={roomData} />
      </div>
    </div>
  );
}
