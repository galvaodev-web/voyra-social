export function compact(n: number) { return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n); }
export function relativeTime(date: string) { const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3600000)); return hours < 1 ? "agora" : hours < 24 ? `há ${hours}h` : `há ${Math.floor(hours / 24)}d`; }
