"use client";

interface SchoolNetInfo {
  name_zh: string;
  district: string;
  description: string;
  top_schools: string[];
}

interface Props {
  net: string;
  info?: SchoolNetInfo;
}

export default function SchoolNetBadge({ net, info }: Props) {
  if (!info || !info.district) {
    return <span className="text-zinc-400">校網 {net}</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
          {net}校網
        </span>
        <span className="font-medium">{info.name_zh}</span>
        <span className="text-xs text-zinc-500">({info.district})</span>
      </div>
      <div className="text-sm text-zinc-400 space-y-1 ml-1">
        <p>{info.description}</p>
        {info.top_schools.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-1">熱門學校：</p>
            <div className="flex flex-wrap gap-1">
              {info.top_schools.map((school, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300">
                  {school}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
