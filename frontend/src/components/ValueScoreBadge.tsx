"use client";

import { scoreColor, scoreBg, scoreLabel, formatPrice, formatPricePerSqft } from "@/lib/utils";

interface Props {
  score: number;
  showLabel?: boolean;
}

export function ValueScoreBadge({ score, showLabel = true }: Props) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-sm font-bold ${scoreBg(score)}`}>
      <span className={scoreColor(score)}>{score.toFixed(1)}</span>
      {showLabel && <span className="text-xs text-zinc-400">{scoreLabel(score)}</span>}
    </div>
  );
}

interface BreakdownProps {
  breakdown: {
    price_vs_historical: number;
    price_vs_peers: number;
    rental_yield: number;
    location: number;
    building_condition: number;
  };
}

export function ScoreBreakdownChart({ breakdown }: BreakdownProps) {
  const items = [
    { label: "低於歷史價", value: breakdown.price_vs_historical, color: "bg-blue-500" },
    { label: "低於同區", value: breakdown.price_vs_peers, color: "bg-purple-500" },
    { label: "回報率", value: breakdown.rental_yield, color: "bg-emerald-500" },
    { label: "地段", value: breakdown.location, color: "bg-amber-500" },
    { label: "樓齡", value: breakdown.building_condition, color: "bg-cyan-500" },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 text-zinc-400 shrink-0">{item.label}</span>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
          </div>
          <span className="w-10 text-right text-zinc-300">{item.value.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

interface ListingRowProps {
  listing: {
    id: number;
    estate_name?: string;
    phase: string;
    block: string;
    floor: string;
    flat: string;
    rooms: string;
    area_sqft: number;
    price: number;
    price_per_sqft: number;
    value_score: number;
    source?: string;
    listed_date?: string;
  };
  showEstate?: boolean;
  rank?: number;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

export function ListingRow({ listing, showEstate = false, rank, selected, onSelect }: ListingRowProps) {
  return (
    <tr className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition ${selected ? "bg-blue-500/10" : ""}`}>
      {rank !== undefined && (
        <td className="py-3 px-3 text-center">
          <span className={`text-sm font-bold ${rank <= 3 ? "text-amber-400" : "text-zinc-500"}`}>
            #{rank}
          </span>
        </td>
      )}
      {onSelect && (
        <td className="py-3 px-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(listing.id)}
            className="rounded border-zinc-600"
          />
        </td>
      )}
      <td className="py-3 px-3">
        {showEstate && listing.estate_name && (
          <span className="text-xs text-zinc-500 block">{listing.estate_name}</span>
        )}
        <span className="text-sm">{listing.phase} {listing.block}</span>
      </td>
      <td className="py-3 px-3 text-sm">{listing.floor} {listing.flat}室</td>
      <td className="py-3 px-3 text-sm">{listing.rooms}</td>
      <td className="py-3 px-3 text-sm text-right">{listing.area_sqft} 呎</td>
      <td className="py-3 px-3 text-sm text-right font-medium">{formatPrice(listing.price)}</td>
      <td className="py-3 px-3 text-sm text-right text-zinc-400">{formatPricePerSqft(listing.price_per_sqft)}/呎</td>
      <td className="py-3 px-3 text-center">
        <ValueScoreBadge score={listing.value_score} showLabel={false} />
      </td>
    </tr>
  );
}
