const TEAM_LOGO_BASE = 'https://raw.githubusercontent.com/n1cheey/RefereeZone/main/teams';

const TEAM_LOGO_MAP: Record<string, string> = {
  'abşeron lions bk': 'Absheron_Lions_BK.png',
  'absheron lions bk': 'Absheron_Lions_BK.png',
  'gəncə bk': 'Gəncə_BK.jpg',
  'gence bk': 'Gəncə_BK.jpg',
  'lənkəran bk': 'Lənkəran_BK.jpg',
  'lenkeran bk': 'Lənkəran_BK.jpg',
  'naxçıvan bk': 'Nakhchivan_BK.png',
  'nakhchivan bk': 'Nakhchivan_BK.png',
  'neftçi ik': 'Neftçi_ik.png',
  'neftchi ik': 'Neftçi_ik.png',
  'ntd bk': 'NTD_BK.png',
  'ordu ik': 'Ordu_IK.jpg',
  'quba bk': 'Quba_BK.png',
  'sabah bk': 'Sabah_BK.png',
  'sərhədçi bk': 'serhedci_bk.jpg',
  'sərhədçi pik': 'serhedci_bk.jpg',
  'serhedci bk': 'serhedci_bk.jpg',
  'şəki bk': 'Sheki_BK.jpg',
  'sheki bk': 'Sheki_BK.jpg',
  'sumqayıt bk': 'Sumqayit.jpg',
  'sumqayit bk': 'Sumqayit.jpg',
};

const normalizeTeamKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const splitTeams = (teams: string) =>
  String(teams || '')
    .split(/\s+(?:vs|v\.?)\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);

export const getTeamLogoUri = (teamName: string) => {
  const filename = TEAM_LOGO_MAP[normalizeTeamKey(teamName)];
  return filename ? `${TEAM_LOGO_BASE}/${encodeURIComponent(filename)}` : null;
};
