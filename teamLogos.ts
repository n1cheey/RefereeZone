const teamAssetModules = import.meta.glob('./teams/*', { eager: true, import: 'default' }) as Record<string, string>;

export const TEAM_OPTIONS = [
  'Abşeron Lions BK',
  'Gəncə BK',
  'Lənkəran BK',
  'Naxçıvan BK',
  'Neftçi İK',
  'NTD BK',
  'Ordu İK',
  'Quba BK',
  'Sabah BK',
  'Sərhədçi PİK',
  'Şəki BK',
  'Sumqayıt BK',
] as const;

const CHARACTER_REPLACEMENTS: Record<string, string> = {
  ə: 'e',
  Ə: 'e',
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ö: 'o',
  Ö: 'o',
  ü: 'u',
  Ü: 'u',
  x: 'kh',
  X: 'kh',
};

const normalizeTeamName = (value: string) =>
  value
    .split('')
    .map((character) => CHARACTER_REPLACEMENTS[character] ?? character)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getTeamAssetUrl = (filenamePart: string) => {
  const normalizedFilenamePart = normalizeTeamName(filenamePart);
  const entry = Object.entries(teamAssetModules).find(([assetPath]) => normalizeTeamName(assetPath).includes(normalizedFilenamePart));
  return entry?.[1] || null;
};

const absheronLionsLogo = getTeamAssetUrl('Absheron_Lions_BK');
const genceLogo = getTeamAssetUrl('Gəncə_BK');
const lenkeranLogo = getTeamAssetUrl('Lənkəran_BK');
const nakhchivanLogo = getTeamAssetUrl('Nakhchivan_BK');
const neftchiLogo = getTeamAssetUrl('neftchi_ik');
const ntdLogo = getTeamAssetUrl('NTD_BK');
const orduLogo = getTeamAssetUrl('Ordu_İK');
const qubaLogo = getTeamAssetUrl('Quba_BK');
const sabahLogo = getTeamAssetUrl('Sabah_BK');
const serhedciLogo = getTeamAssetUrl('serhedci_bk');
const shekiLogo = getTeamAssetUrl('Sheki_BK');
const sumqayitLogo = getTeamAssetUrl('Sumqayit');

const TEAM_LOGO_BY_KEY: Record<string, string | null> = {
  'absheron bk': absheronLionsLogo,
  'absheron lions bk': absheronLionsLogo,
  'abseron bk': absheronLionsLogo,
  'abseron lions bk': absheronLionsLogo,
  'gence bk': genceLogo,
  'lenkeran bk': lenkeranLogo,
  'nakhchivan bk': nakhchivanLogo,
  'nakhcivan bk': nakhchivanLogo,
  'naxcivan bk': nakhchivanLogo,
  'naxchivan bk': nakhchivanLogo,
  'neftchi ik': neftchiLogo,
  'neftchi bk': neftchiLogo,
  'ntd bk': ntdLogo,
  'ordu ik': orduLogo,
  'quba bk': qubaLogo,
  'sabah bk': sabahLogo,
  'serhedci pik': serhedciLogo,
  'serhedchi pik': serhedciLogo,
  'serhedci bk': serhedciLogo,
  'serhedchi bk': serhedciLogo,
  'sheki bk': shekiLogo,
  'seki bk': shekiLogo,
  'sumqayit bk': sumqayitLogo,
  'sumqayit': sumqayitLogo,
  'sumgait bk': sumqayitLogo,
};

export const getTeamLogoUrl = (teamName: string) => TEAM_LOGO_BY_KEY[normalizeTeamName(teamName)] || null;

export const splitMatchTeams = (teams: string) =>
  String(teams || '')
    .split(/\s+(?:vs|v\.?)\s+|\s+-\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

export const formatMatchTeams = (team1: string, team2: string) => {
  const left = String(team1 || '').trim();
  const right = String(team2 || '').trim();
  if (!left || !right) {
    return '';
  }

  return `${left} vs ${right}`;
};
