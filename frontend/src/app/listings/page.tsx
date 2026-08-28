"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, Listing, Estate } from "@/lib/api";
import { ListingRow } from "@/components/ValueScoreBadge";
import FilterBar from "@/components/FilterBar";
import { Suspense } from "react";

function ListingsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getEstates(), api.getListings({
      estate_id: searchParams.get("estate_id") || undefined,
      min_price: searchParams.get("min_price") || undefined,
      max_price: searchParams.get("max_price") || undefined,
      min_area: searchParams.get("min_area") || undefined,
      bedrooms: searchParams.get("bedrooms") || undefined,
      limit: 100,
    })]).then(([e, l]) => {
      setEstates(e);
      setListings(l.listings);
      setTotal(l.total);
    }).catch(console.error).finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">放盤搜尋</h1>
        <p className="text-zinc-500 text-sm">共 {total} 個放盤</p>
      </div>

      <FilterBar estates={estates} />

      {loading ? (
        <div className="text-center py-10 text-zinc-500">載入中...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-10 text-zinc-500">無結果</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="py-2 px-3 text-left">位置</th>
                <th className="py-2 px-3 text-left">樓層</th>
                <th className="py-2 px-3 text-left">間隔</th>
                <th className="py-2 px-3 text-right">實用面積</th>
                <th className="py-2 px-3 text-right">售價</th>
                <th className="py-2 px-3 text-right">呎價</th>
                <th className="py-2 px-3 text-center">價值評分</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <ListingRow key={l.id} listing={l} showEstate />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-zinc-500">載入中...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
