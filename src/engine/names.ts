const NAMES: Record<string, string> = {
  ARE: "United Arab Emirates",
  ARG: "Argentina",
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Belgium",
  BGD: "Bangladesh",
  BRA: "Brazil",
  CAN: "Canada",
  CHE: "Switzerland",
  CHL: "Chile",
  CHN: "China",
  COL: "Colombia",
  CZE: "Czechia",
  DEU: "Germany",
  DNK: "Denmark",
  EGY: "Egypt",
  ESP: "Spain",
  FIN: "Finland",
  FRA: "France",
  GBR: "United Kingdom",
  GRC: "Greece",
  HKG: "Hong Kong",
  HUN: "Hungary",
  IDN: "Indonesia",
  IND: "India",
  IRL: "Ireland",
  ISR: "Israel",
  ITA: "Italy",
  JPN: "Japan",
  KAZ: "Kazakhstan",
  KOR: "South Korea",
  KWT: "Kuwait",
  MAR: "Morocco",
  MEX: "Mexico",
  MYS: "Malaysia",
  NGA: "Nigeria",
  NLD: "Netherlands",
  NOR: "Norway",
  NZL: "New Zealand",
  PAK: "Pakistan",
  PER: "Peru",
  PHL: "Philippines",
  POL: "Poland",
  PRT: "Portugal",
  ROU: "Romania",
  RUS: "Russia",
  SAU: "Saudi Arabia",
  SGP: "Singapore",
  SWE: "Sweden",
  THA: "Thailand",
  TUR: "Turkey",
  TWN: "Taiwan",
  UKR: "Ukraine",
  USA: "United States",
  VEN: "Venezuela",
  VNM: "Vietnam",
  ZAF: "South Africa",
};

export function countryName(iso: string, fallback?: string): string {
  if (NAMES[iso]) return NAMES[iso];
  if (fallback && fallback !== iso && fallback.length > 3) return fallback;
  return iso;
}

export function sortCountries(rows: { id: string; name: string }[]): { id: string; name: string }[] {
  return [...rows].sort((a, b) => {
    if (a.id === "FRA") return -1;
    if (b.id === "FRA") return 1;
    const aCode = a.name === a.id;
    const bCode = b.name === b.id;
    if (aCode !== bCode) return aCode ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}
