const teamAssetModules = import.meta.glob('./teams/*', { eager: true, import: 'default' }) as Record<string, string>;

export const TEAM_OPTIONS = [
  'Ab\u015feron Lions BK',
  'G\u0259nc\u0259 BK',
  'L\u0259nk\u0259ran BK',
  'Nax\u00e7\u0131van BK',
  'Neft\u00e7i \u0130K',
  'NTD BK',
  'Ordu \u0130K',
  'Quba BK',
  'Sabah BK',
  'S\u0259rh\u0259d\u00e7i P\u0130K',
  '\u015e\u0259ki BK',
  'Sumqay\u0131t BK',
] as const;

const CHARACTER_REPLACEMENTS: Record<string, string> = {
  '\u0259': 'e',
  '\u018f': 'e',
  '\u0131': 'i',
  '\u0130': 'i',
  '\u015f': 's',
  '\u015e': 's',
  '\u00e7': 'c',
  '\u00c7': 'c',
  '\u011f': 'g',
  '\u011e': 'g',
  '\u00f6': 'o',
  '\u00d6': 'o',
  '\u00fc': 'u',
  '\u00dc': 'u',
  x: 'kh',
  X: 'kh',
};

const normalizeTeamName = (value: string) =>
  String(value || '')
    .split('')
    .map((character) => CHARACTER_REPLACEMENTS[character] ?? character)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const ASSET_URL_BY_NORMALIZED_BASENAME = Object.fromEntries(
  Object.entries(teamAssetModules).map(([assetPath, assetUrl]) => {
    const filename = assetPath.split('/').pop() || assetPath;
    const basename = filename.replace(/\.[^.]+$/, '');
    return [normalizeTeamName(basename), assetUrl];
  }),
) as Record<string, string>;

const CANONICAL_TEAM_NAME_BY_KEY: Record<string, string> = {
  'absheron bk': 'Ab\u015feron Lions BK',
  'absheron lions bk': 'Ab\u015feron Lions BK',
  'abseron bk': 'Ab\u015feron Lions BK',
  'abseron lions bk': 'Ab\u015feron Lions BK',
  'gence bk': 'G\u0259nc\u0259 BK',
  'lenkeran bk': 'L\u0259nk\u0259ran BK',
  'nakhchivan bk': 'Nax\u00e7\u0131van BK',
  'nakhcivan bk': 'Nax\u00e7\u0131van BK',
  'naxcivan bk': 'Nax\u00e7\u0131van BK',
  'naxchivan bk': 'Nax\u00e7\u0131van BK',
  'neftchi ik': 'Neft\u00e7i \u0130K',
  'neftci ik': 'Neft\u00e7i \u0130K',
  'neftchi bk': 'Neft\u00e7i \u0130K',
  'neftci bk': 'Neft\u00e7i \u0130K',
  'ntd bk': 'NTD BK',
  'ordu ik': 'Ordu \u0130K',
  'quba bk': 'Quba BK',
  'sabah bk': 'Sabah BK',
  'serhedci pik': 'S\u0259rh\u0259d\u00e7i P\u0130K',
  'serhedchi pik': 'S\u0259rh\u0259d\u00e7i P\u0130K',
  'serhedci bk': 'S\u0259rh\u0259d\u00e7i P\u0130K',
  'serhedchi bk': 'S\u0259rh\u0259d\u00e7i P\u0130K',
  'sheki bk': '\u015e\u0259ki BK',
  'seki bk': '\u015e\u0259ki BK',
  'sumqayit bk': 'Sumqay\u0131t BK',
  'sumqayit': 'Sumqay\u0131t BK',
  'sumgait bk': 'Sumqay\u0131t BK',
};

const getTeamAssetUrl = (filenamePart: string) => {
  const normalizedFilenamePart = normalizeTeamName(filenamePart);
  return ASSET_URL_BY_NORMALIZED_BASENAME[normalizedFilenamePart] || null;
};

const absheronLionsLogo = getTeamAssetUrl('Absheron_Lions_BK');
const genceLogo = getTeamAssetUrl('G\u0259nc\u0259_BK');
const lenkeranLogo = getTeamAssetUrl('L\u0259nk\u0259ran_BK');
const nakhchivanLogo = getTeamAssetUrl('Nakhchivan_BK');
const neftchiLogo = getTeamAssetUrl('Neftçi_ik');
const ntdLogo = getTeamAssetUrl('NTD_BK');
const orduLogo = getTeamAssetUrl('Ordu_IK');
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
  'neftci ik': neftchiLogo,
  'neftchi bk': neftchiLogo,
  'neftci bk': neftchiLogo,
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

export const getCanonicalTeamName = (teamName: string) => CANONICAL_TEAM_NAME_BY_KEY[normalizeTeamName(teamName)] || String(teamName || '').trim();

export const getTeamLogoUrl = (teamName: string) => TEAM_LOGO_BY_KEY[normalizeTeamName(teamName)] || null;

export const splitMatchTeams = (teams: string) =>
  String(teams || '')
    .split(/\s+(?:vs|v\.?)\s+|\s+-\s+/i)
    .map((part) => getCanonicalTeamName(part))
    .filter(Boolean);

export const formatMatchTeams = (team1: string, team2: string) => {
  const left = getCanonicalTeamName(team1);
  const right = getCanonicalTeamName(team2);
  if (!left || !right) {
    return '';
  }

  return `${left} vs ${right}`;
};
