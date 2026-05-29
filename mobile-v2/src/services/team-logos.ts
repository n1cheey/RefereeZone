const TEAM_LOGO_BASE = 'https://raw.githubusercontent.com/n1cheey/RefereeZone/main/teams';

type TeamAliasEntry = {
  canonical: string;
  filename: string;
  aliases: string[];
};

const TEAM_ALIASES: TeamAliasEntry[] = [
  {
    canonical: 'Abşeron Lions BK',
    filename: 'Absheron_Lions_BK.png',
    aliases: ['Abşeron Lions BK', 'Absheron Lions BK', 'Abseron Lions BK'],
  },
  {
    canonical: 'Gəncə BK',
    filename: 'Gəncə_BK.jpg',
    aliases: ['Gəncə BK', 'Gence BK', 'Ganca BK'],
  },
  {
    canonical: 'Lənkəran BK',
    filename: 'Lənkəran_BK.jpg',
    aliases: ['Lənkəran BK', 'Lenkeran BK'],
  },
  {
    canonical: 'Naxçıvan BK',
    filename: 'Nakhchivan_BK.png',
    aliases: ['Naxçıvan BK', 'Nakhchivan BK'],
  },
  {
    canonical: 'Neftçi İK',
    filename: 'Neftçi_ik.png',
    aliases: ['Neftçi İK', 'Neftchi IK', 'Neftci IK'],
  },
  {
    canonical: 'NTD BK',
    filename: 'NTD_BK.png',
    aliases: ['NTD BK'],
  },
  {
    canonical: 'Ordu İK',
    filename: 'Ordu_IK.jpg',
    aliases: ['Ordu İK', 'Ordu IK'],
  },
  {
    canonical: 'Quba BK',
    filename: 'Quba_BK.png',
    aliases: ['Quba BK'],
  },
  {
    canonical: 'Sabah BK',
    filename: 'Sabah_BK.png',
    aliases: ['Sabah BK'],
  },
  {
    canonical: 'Sərhədçi BK',
    filename: 'serhedci_bk.jpg',
    aliases: ['Sərhədçi BK', 'Serhedci BK', 'Sərhədçi PİK'],
  },
  {
    canonical: 'Şəki BK',
    filename: 'Sheki_BK.jpg',
    aliases: ['Şəki BK', 'Sheki BK'],
  },
  {
    canonical: 'Sumqayıt BK',
    filename: 'Sumqayit.jpg',
    aliases: ['Sumqayıt BK', 'Sumqayit BK'],
  },
];

const foldString = (value: string) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ə/g, 'e')
    .replace(/Ə/g, 'e')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const normalizeTeamKey = (value: string) =>
  foldString(String(value || '').replace(/[–—]/g, '-').replace(/\s+/g, ' '));

const LOGO_MAP = new Map<string, { canonical: string; filename: string }>();
for (const team of TEAM_ALIASES) {
  for (const alias of team.aliases) {
    LOGO_MAP.set(normalizeTeamKey(alias), { canonical: team.canonical, filename: team.filename });
  }
}

export const KNOWN_TEAM_OPTIONS = TEAM_ALIASES.map((item) => item.canonical).sort((left, right) =>
  left.localeCompare(right, 'az'),
);

const cleanDisplayTeam = (value: string) => {
  const normalized = normalizeTeamKey(value);
  return LOGO_MAP.get(normalized)?.canonical || String(value || '').trim();
};

export const splitTeams = (teams: string) => {
  const raw = String(teams || '').trim();
  if (!raw) {
    return ['', ''];
  }

  const vsMatch = raw
    .split(/\s+(?:vs|v\.?)\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
  if (vsMatch.length === 2) {
    return vsMatch.map(cleanDisplayTeam) as [string, string];
  }

  const normalizedFull = normalizeTeamKey(raw);
  for (const home of KNOWN_TEAM_OPTIONS) {
    const normalizedHome = normalizeTeamKey(home);
    if (!normalizedFull.startsWith(normalizedHome)) {
      continue;
    }

    const remaining = normalizedFull.slice(normalizedHome.length).replace(/^\s*-\s*/, '').trim();
    if (!remaining) {
      continue;
    }

    const away = TEAM_ALIASES.find((team) => team.aliases.some((alias) => normalizeTeamKey(alias) === remaining));
    if (away) {
      return [home, away.canonical];
    }
  }

  const hyphenMatch = raw
    .split(/\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (hyphenMatch.length === 2) {
    return hyphenMatch.map(cleanDisplayTeam) as [string, string];
  }

  return [cleanDisplayTeam(raw), cleanDisplayTeam(raw)];
};

export const getTeamLogoUri = (teamName: string) => {
  const item = LOGO_MAP.get(normalizeTeamKey(teamName));
  return item ? `${TEAM_LOGO_BASE}/${encodeURIComponent(item.filename)}` : null;
};

export const searchTeamOptions = (query: string) => {
  const normalizedQuery = normalizeTeamKey(query);
  if (!normalizedQuery) {
    return KNOWN_TEAM_OPTIONS;
  }

  return KNOWN_TEAM_OPTIONS.filter((team) => normalizeTeamKey(team).includes(normalizedQuery));
};
