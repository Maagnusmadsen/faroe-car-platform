/**
 * Default coordinates and island for Faroe Islands towns.
 * Used when creating new listings so map and location filters work.
 */

export interface TownInfo {
  latitude: number;
  longitude: number;
  island: string;
}

const TOWN_MAP: Record<string, TownInfo> = {
  "Tórshavn": { latitude: 62.0097, longitude: -6.7716, island: "Streymoy" },
  "Torshavn": { latitude: 62.0097, longitude: -6.7716, island: "Streymoy" },
  "Klaksvík": { latitude: 62.2261, longitude: -6.589, island: "Borðoy" },
  "Klaksvik": { latitude: 62.2261, longitude: -6.589, island: "Borðoy" },
  "Runavík": { latitude: 62.1094, longitude: -6.7217, island: "Eysturoy" },
  "Runavik": { latitude: 62.1094, longitude: -6.7217, island: "Eysturoy" },
  "Vágur": { latitude: 61.4733, longitude: -6.8092, island: "Suðuroy" },
  "Vagur": { latitude: 61.4733, longitude: -6.8092, island: "Suðuroy" },
  "Eiði": { latitude: 62.2992, longitude: -7.0922, island: "Eysturoy" },
  "Eidi": { latitude: 62.2992, longitude: -7.0922, island: "Eysturoy" },
  "Vágar": { latitude: 62.05, longitude: -7.2, island: "Vágar" },
  "Vagar": { latitude: 62.05, longitude: -7.2, island: "Vágar" },
  "Sandavágur": { latitude: 62.0533, longitude: -7.1536, island: "Vágar" },
  "Sandavagur": { latitude: 62.0533, longitude: -7.1536, island: "Vágar" },
  "Miðvágur": { latitude: 62.0511, longitude: -7.1933, island: "Vágar" },
  "Midvagur": { latitude: 62.0511, longitude: -7.1933, island: "Vágar" },
  "Sørvágur": { latitude: 62.1117, longitude: -7.3572, island: "Vágar" },
  "Sorvagur": { latitude: 62.1117, longitude: -7.3572, island: "Vágar" },
};

const DEFAULT: TownInfo = { latitude: 62.0097, longitude: -6.7716, island: "Streymoy" };

export function getTownInfo(townOrLocation: string): TownInfo {
  const key = townOrLocation.trim();
  if (!key) return DEFAULT;
  const exact = TOWN_MAP[key];
  if (exact) return exact;
  const normalized = key
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
  for (const [name, info] of Object.entries(TOWN_MAP)) {
    if (name.toLowerCase() === normalized.toLowerCase()) return info;
  }
  return DEFAULT;
}
