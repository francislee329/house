"use client";

interface DeveloperInfo {
  rating: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
}

interface Props {
  developer: string;
  info?: DeveloperInfo;
  showDescription?: boolean;
}

const RATING_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  A: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  B: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  C: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30" },
};

export default function DeveloperBadge({ developer, info, showDescription = false }: Props) {
  if (!info) return <span className="text-zinc-400">{developer}</span>;

  const style = RATING_STYLES[info.rating] || RATING_STYLES.B;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-bold rounded border ${style.bg} ${style.text} ${style.border}`}>
          {info.rating}
        </span>
        <span className="font-medium">{developer}</span>
        <span className={`text-xs ${style.text}`}>({info.label})</span>
      </div>
      {showDescription && (
        <div className="text-sm text-zinc-400 space-y-1">
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
