"use client";

interface DeveloperInfo {
  rating: string;
  label: string;
  name_zh: string;
  description: string;
  pros: string[];
  cons: string[];
}

interface Props {
  developer: string;
  info?: DeveloperInfo;
  showDescription?: boolean;
}

const RATING_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  S: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", icon: "👑" },
  A: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", icon: "⭐" },
  B: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", icon: "🔹" },
  C: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30", icon: "◽" },
};

export default function DeveloperBadge({ developer, info, showDescription = false }: Props) {
  if (!info) return <span className="text-zinc-400">{developer}</span>;

  const style = RATING_STYLES[info.rating] || RATING_STYLES.B;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded border ${style.bg} ${style.text} ${style.border}`}>
          <span>{style.icon}</span>
          <span>{info.rating}</span>
        </span>
        <span className="font-medium">{info.name_zh}</span>
        <span className="text-xs text-zinc-500">({developer})</span>
      </div>
      {showDescription && (
        <div className="text-sm text-zinc-400 space-y-1 ml-1">
          <p>{info.description}</p>
          {info.pros.length > 0 && (
            <p className="text-emerald-400/80">
              {info.pros.join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DeveloperRatingLegend() {
  const ratings = [
    { rating: "S", label: "第一梯隊", desc: "頂級品質、抗跌力最強", icon: "👑" },
    { rating: "A", label: "第二梯隊", desc: "設計感強、品質中上", icon: "⭐" },
    { rating: "B", label: "第三梯隊", desc: "性價比高、手工因盤而異", icon: "🔹" },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {ratings.map((r) => {
        const style = RATING_STYLES[r.rating];
        return (
          <span key={r.rating} className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${style.bg} ${style.text} ${style.border}`}>
            <span>{r.icon}</span>
            <span className="font-bold">{r.rating}</span>
            <span>{r.label}</span>
          </span>
        );
      })}
    </div>
  );
}
