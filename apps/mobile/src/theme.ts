export const theme = {
  bg: "#07070c",
  bg2: "#0e0e16",
  card: "#111119",
  accent: "#ff6b35",
  gold: "#ffd700",
  hp: "#e63946",
  mp: "#4895ef",
  xp: "#06d6a0",
  shield: "#8338ec",
  text: "#e8e6e3",
  dim: "#6b6b7b",
  faint: "#2a2a3a",
  border: "#1a1a28",
  success: "#06d6a0",
  danger: "#ef476f",
} as const;

export const rarityColor = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
} as const;

export const nodeColor = {
  small: "#6b6b7b",
  notable: "#ff6b35",
  keystone: "#ffd700",
  active: "#8338ec",
} as const;

export const barTypeColor = {
  dive: "#8B4513",
  pub: "#228B22",
  sports: "#2563eb",
  cocktail: "#8338ec",
  wine: "#722f37",
  brewery: "#DAA520",
  nightclub: "#ff006e",
} as const;

export type BarType = keyof typeof barTypeColor;
