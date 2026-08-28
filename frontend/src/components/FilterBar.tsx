"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Estate } from "@/lib/api";

interface Props {
  estates: Estate[];
}

export default function FilterBar({ estates }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    estate_id: "",
    min_price: "",
    max_price: "",
    min_area: "",
    bedrooms: "",
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-[#13131a] border border-zinc-800">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">屋苑</label>
        <select
          value={filters.estate_id}
          onChange={(e) => setFilters({ ...filters, estate_id: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全部</option>
          {estates.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">最低價</label>
        <input
          type="number"
          placeholder="不限"
          value={filters.min_price}
          onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-28"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">最高價</label>
        <input
          type="number"
          placeholder="不限"
          value={filters.max_price}
          onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-28"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">最低面積(呎)</label>
        <input
          type="number"
          placeholder="不限"
          value={filters.min_area}
          onChange={(e) => setFilters({ ...filters, min_area: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-24"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">房間</label>
        <select
          value={filters.bedrooms}
          onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">全部</option>
          <option value="1">1房</option>
          <option value="2">2房</option>
          <option value="3">3房</option>
        </select>
      </div>
      <button
        onClick={applyFilters}
        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        搜尋
      </button>
    </div>
  );
}
