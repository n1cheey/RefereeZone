const absheronLionsLogo = new URL('./teams/Absheron_Lions_BK.png', import.meta.url).href;
const genceLogo = new URL('./teams/Gəncə_BK.jpg', import.meta.url).href;
const lenkeranLogo = new URL('./teams/Lənkəran_BK.jpg', import.meta.url).href;
const nakhchivanLogo = new URL('./teams/Nakhchivan_BK.png', import.meta.url).href;
const neftchiLogo = new URL('./teams/neftchi_ik.png', import.meta.url).href;
const ntdLogo = new URL('./teams/NTD_BK.png', import.meta.url).href;
const orduLogo = new URL('./teams/Ordu_İK.png', import.meta.url).href;
const qubaLogo = new URL('./teams/Quba_BK.png', import.meta.url).href;
const sabahLogo = new URL('./teams/Sabah_BK.png', import.meta.url).href;
const serhedciLogo = new URL('./teams/serhedci_bk.jpg', import.meta.url).href;
const shekiLogo = new URL('./teams/Sheki_BK.jpg', import.meta.url).href;

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

const TEAM_LOGO_BY_KEY: Record<string, string> = {
  'absheron lions bk': absheronLionsLogo,
  'abseron lions bk': absheronLionsLogo,
  'gence bk': genceLogo,
  'lenkeran bk': lenkeranLogo,
  'nakhchivan bk': nakhchivanLogo,
  'nakhcivan bk': nakhchivanLogo,
  'naxcivan bk': nakhchivanLogo,
  'neftchi ik': neftchiLogo,
  'ntd bk': ntdLogo,
  'ordu ik': orduLogo,
  'quba bk': qubaLogo,
  'sabah bk': sabahLogo,
  'serhedci bk': serhedciLogo,
  'serhedchi bk': serhedciLogo,
  'sheki bk': shekiLogo,
  'seki bk': shekiLogo,
};

export const getTeamLogoUrl = (teamName: string) => TEAM_LOGO_BY_KEY[normalizeTeamName(teamName)] || null;

export const splitMatchTeams = (teams: string) => {
  const parts = teams.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(0, 2) : [teams];
};
