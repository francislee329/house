export function formatPrice(price: number): string {
  if (price >= 10000000) {
    return `$${(price / 10000000).toFixed(2)}億`;
  }
  if (price >= 10000) {
    return `$${(price / 10000).toFixed(0)}萬`;
  }
  return `$${price.toLocaleString()}`;
}

export function formatPricePerSqft(psf: number): string {
  return `$${psf.toLocaleString()}`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/20 border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "筍盤";
  if (score >= 60) return "合理";
  return "偏貴";
}
