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

const cleanSourceText = (value: string) =>
  String(value || '')
    .replace(/\uFFFD/g, ' ')
    .replace(/\?+/g, ' ')
    .replace(/Р вЂњР’В§|Р“В§/g, 'c')
    .replace(/Р вЂќРЎСџ|Р”Сџ/g, 'g')
    .replace(/Р вЂќР’В±|Р”В±/g, 'i')
    .replace(/Р в„ўРІвЂћСћ|Р™в„ў/g, 'e')
    .replace(/Р вЂњРЎВ|Р“С/g, 'u');

const normalizeLooseText = (value: string) =>
  cleanSourceText(value)
    .split('')
    .map((character) => CHARACTER_REPLACEMENTS[character] ?? character)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeTeamName = (value: string) => normalizeLooseText(value);

const cleanDisplayText = (value: string) =>
  cleanSourceText(value)
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

const ASSET_URL_BY_NORMALIZED_BASENAME = Object.fromEntries(
  Object.entries(teamAssetModules).map(([assetPath, assetUrl]) => {
    const filename = assetPath.split('/').pop() || assetPath;
    const basename = filename.replace(/\.[^.]+$/, '');
    return [normalizeTeamName(basename), assetUrl];
  }),
) as Record<string, string>;

const CANONICAL_TEAM_NAME_BY_KEY: Record<string, string> = {};
const TEAM_LOGO_BY_KEY: Record<string, string | null> = {};

const registerTeam = (canonicalName: string, assetLookupName: string, aliases: string[]) => {
  const assetUrl = ASSET_URL_BY_NORMALIZED_BASENAME[normalizeTeamName(assetLookupName)] || null;
  aliases.forEach((alias) => {
    const normalizedAlias = normalizeTeamName(alias);
    CANONICAL_TEAM_NAME_BY_KEY[normalizedAlias] = canonicalName;
    TEAM_LOGO_BY_KEY[normalizedAlias] = assetUrl;
  });
};

registerTeam('Ab\u015feron Lions BK', 'Absheron_Lions_BK', [
  'Ab\u015feron Lions BK',
  'Absheron Lions BK',
  'Absheron BK',
  'Abseron Lions BK',
  'Abseron BK',
  'Ab eron Lions BK',
  'Ab eron BK',
  'Ab eron Lions',
  'Ab eron',
]);

registerTeam('G\u0259nc\u0259 BK', 'G\u0259nc\u0259_BK', [
  'G\u0259nc\u0259 BK',
  'Gence BK',
  'Gence',
  'G nc BK',
  'G nc',
  'G nc  BK',
]);

registerTeam('L\u0259nk\u0259ran BK', 'L\u0259nk\u0259ran_BK', [
  'L\u0259nk\u0259ran BK',
  'Lenkeran BK',
  'Lenkeran',
  'L nk ran BK',
  'L nk ran',
]);

registerTeam('Nax\u00e7\u0131van BK', 'Nakhchivan_BK', [
  'Nax\u00e7\u0131van BK',
  'Nakhchivan BK',
  'Nakhcivan BK',
  'Naxcivan BK',
  'Naxchivan BK',
  'Nax van BK',
  'Nax van',
]);

registerTeam('Neft\u00e7i \u0130K', 'Neft\u00e7i_ik', [
  'Neft\u00e7i \u0130K',
  'Neftchi IK',
  'Neftci IK',
  'Neftchi BK',
  'Neftci BK',
  'Neftchi I K',
  'Neftci I K',
  'Neft i IK',
  'Neft i I K',
  'Neft i K',
  'Neft i BK',
]);

registerTeam('NTD BK', 'NTD_BK', ['NTD BK']);
registerTeam('Ordu \u0130K', 'Ordu_IK', ['Ordu \u0130K', 'Ordu IK', 'Ordu K']);
registerTeam('Quba BK', 'Quba_BK', ['Quba BK']);
registerTeam('Sabah BK', 'Sabah_BK', ['Sabah BK']);

registerTeam('S\u0259rh\u0259d\u00e7i BK', 'serhedci_bk', [
  'S\u0259rh\u0259d\u00e7i BK',
  'S\u0259rh\u0259d\u00e7i P\u0130K',
  'S\u0259rh\u0259d\u00e7i BK',
  'Serhedci PIK',
  'Serhedchi PIK',
  'Serhedci BK',
  'Serhedchi BK',
  'Serhedci',
  'S rh d i BK',
  'S rh d i PIK',
]);

registerTeam('\u015e\u0259ki BK', 'Sheki_BK', ['\u015e\u0259ki BK', 'Sheki BK', 'Seki BK']);
registerTeam('Sumqay\u0131t BK', 'Sumqayit', ['Sumqay\u0131t BK', 'Sumqayit BK', 'Sumqayit', 'Sumgait BK']);

const CANONICAL_VENUE_NAME_BY_KEY: Record<string, string> = {
  'baki idman sarayi b i s': 'Bak\u0131 \u0130dman Saray\u0131 (B.\u0130.S)',
  'baki idman sarayi bis': 'Bak\u0131 \u0130dman Saray\u0131 (B.\u0130.S)',
  'bak dman saray b i s': 'Bak\u0131 \u0130dman Saray\u0131 (B.\u0130.S)',
  'bak dman saray b s': 'Bak\u0131 \u0130dman Saray\u0131 (B.\u0130.S)',
  'gence idman sarayi g i s': 'G\u0259nc\u0259 \u0130dman Saray\u0131 (G.\u0130.S)',
  'gence idman sarayi gis': 'G\u0259nc\u0259 \u0130dman Saray\u0131 (G.\u0130.S)',
  'g nc idman sarayi g i s': 'G\u0259nc\u0259 \u0130dman Saray\u0131 (G.\u0130.S)',
  'g nc dman saray g s': 'G\u0259nc\u0259 \u0130dman Saray\u0131 (G.\u0130.S)',
  'serhedci arena': 'S\u0259rh\u0259d\u00e7i Arena',
  'serhedchi arena': 'S\u0259rh\u0259d\u00e7i Arena',
  'ask arena': 'ASK Arena',
};

const CANONICAL_PERSON_NAME_BY_KEY: Record<string, string> = {
  'asif basirov': 'Asif B\u0259\u015firov',
  'asif ba sirov': 'Asif B\u0259\u015firov',
  'asif ba ov': 'Asif B\u0259\u015firov',
  'nigar aliyeva': 'Nigar \u018fliyeva',
  'nigar al iyeva': 'Nigar \u018fliyeva',
  'allahverdi yusifov': 'Allahverdi Yusifov',
  'ceyran ismayilova': 'Ceyran \u0130smay\u0131lova',
  'ceyran smay lova': 'Ceyran \u0130smay\u0131lova',
  'ceyran smaylova': 'Ceyran \u0130smay\u0131lova',
  'sabir memmedov': 'Sabir M\u0259mm\u0259dov',
  'sabir mammadov': 'Sabir M\u0259mm\u0259dov',
  'sabir m mm dov': 'Sabir M\u0259mm\u0259dov',
  'sabir mm dov': 'Sabir M\u0259mm\u0259dov',
  'sofiya kerimova': 'Sofiya K\u0259rimova',
  'sofiya k rimova': 'Sofiya K\u0259rimova',
  'togrul hasanov': 'To\u011frul H\u0259s\u0259nov',
  'to grul hasanov': 'To\u011frul H\u0259s\u0259nov',
  'to rul h sanov': 'To\u011frul H\u0259s\u0259nov',
  'to rul h s nov': 'To\u011frul H\u0259s\u0259nov',
  'ayxan mirz yev': 'Ayxan Mirz\u0259yev',
  'ayxan mirzyev': 'Ayxan Mirz\u0259yev',
  'amo liyev': 'Amo \u018fliyev',
  'amo aliyev': 'Amo \u018fliyev',
  'ruslan c frov': 'Ruslan C\u0259f\u0259rov',
  'ruslan c f rov': 'Ruslan C\u0259f\u0259rov',
  'ruslan cef rov': 'Ruslan C\u0259f\u0259rov',
  'z hra salmanova': 'Z\u0259hra Salmanova',
  'zehra salmanova': 'Z\u0259hra Salmanova',
};

const DISPLAY_TEXT_BY_KEY: Record<string, string> = {
  'ab eron lions bk': 'Ab\u015feron Lions BK',
  'ab eron bk': 'Ab\u015feron Lions BK',
  'ab eron lions': 'Ab\u015feron Lions BK',
  'ab eron': 'Ab\u015feron',
  'g nc bk': 'G\u0259nc\u0259 BK',
  'g nc': 'G\u0259nc\u0259',
  'l nk ran bk': 'L\u0259nk\u0259ran BK',
  'l nk ran': 'L\u0259nk\u0259ran',
  'nax van bk': 'Nax\u00e7\u0131van BK',
  'nax van': 'Nax\u00e7\u0131van',
  'ki bk': '\u015e\u0259ki BK',
  'ki': '\u015e\u0259ki BK',
  'neft i ik': 'Neft\u00e7i \u0130K',
  'neft i k': 'Neft\u00e7i \u0130K',
  'neft i bk': 'Neft\u00e7i \u0130K',
  'ordu k': 'Ordu \u0130K',
  'ordu ik': 'Ordu \u0130K',
  's rh d i bk': 'S\u0259rh\u0259d\u00e7i BK',
  's rh d i pik': 'S\u0259rh\u0259d\u00e7i BK',
};

const compactNormalizedText = (value: string) => normalizeLooseText(value).replace(/\s+/g, '');

const getLevenshteinDistance = (left: string, right: string) => {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
};

const findClosestNormalizedKey = (value: string, candidates: string[]) => {
  const compactValue = compactNormalizedText(value);
  if (!compactValue) {
    return null;
  }

  let bestMatch: { key: string; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = getLevenshteinDistance(compactValue, candidate.replace(/\s+/g, ''));
    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { key: candidate, distance };
    }
  }

  if (!bestMatch) {
    return null;
  }

  const threshold = Math.max(2, Math.floor(bestMatch.key.replace(/\s+/g, '').length * 0.35));
  return bestMatch.distance <= threshold ? bestMatch.key : null;
};

const getCanonicalDisplayText = (value: string) => {
  const normalizedValue = normalizeLooseText(value);
  return DISPLAY_TEXT_BY_KEY[normalizedValue] || cleanDisplayText(value);
};

export const getCanonicalTeamName = (teamName: string) => {
  const normalizedTeamName = normalizeTeamName(teamName);
  const directMatch = CANONICAL_TEAM_NAME_BY_KEY[normalizedTeamName];
  if (directMatch) {
    return directMatch;
  }

  const fuzzyKey = findClosestNormalizedKey(teamName, Object.keys(CANONICAL_TEAM_NAME_BY_KEY));
  return (fuzzyKey ? CANONICAL_TEAM_NAME_BY_KEY[fuzzyKey] : null) || getCanonicalDisplayText(teamName);
};

export const getTeamLogoUrl = (teamName: string) => {
  const normalizedTeamName = normalizeTeamName(teamName);
  const directLogo = TEAM_LOGO_BY_KEY[normalizedTeamName];
  if (directLogo) {
    return directLogo;
  }

  const fuzzyKey = findClosestNormalizedKey(teamName, Object.keys(TEAM_LOGO_BY_KEY));
  if (fuzzyKey && TEAM_LOGO_BY_KEY[fuzzyKey]) {
    return TEAM_LOGO_BY_KEY[fuzzyKey];
  }

  const canonicalName = CANONICAL_TEAM_NAME_BY_KEY[normalizedTeamName];
  return canonicalName ? ASSET_URL_BY_NORMALIZED_BASENAME[normalizeTeamName(canonicalName)] || null : null;
};

export const getCanonicalVenueName = (venueName: string) =>
  CANONICAL_VENUE_NAME_BY_KEY[normalizeLooseText(venueName)] || getCanonicalDisplayText(venueName);

export const getDisplayPersonName = (fullName: string) => {
  const normalizedFullName = normalizeLooseText(fullName);
  const directMatch = CANONICAL_PERSON_NAME_BY_KEY[normalizedFullName];
  if (directMatch) {
    return directMatch;
  }

  const fuzzyKey = findClosestNormalizedKey(fullName, Object.keys(CANONICAL_PERSON_NAME_BY_KEY));
  return (fuzzyKey ? CANONICAL_PERSON_NAME_BY_KEY[fuzzyKey] : null) || getCanonicalDisplayText(fullName);
};

export const getDisplayMatchTeams = (teams: string) => {
  const teamItems = splitMatchTeams(teams);
  if (teamItems.length >= 2) {
    return formatMatchTeams(teamItems[0], teamItems[1]) || teamItems.join(' vs ');
  }

  return teamItems[0] || getCanonicalTeamName(teams);
};

export const getDisplayGameCode = (gameCode: string) =>
  (() => {
    const normalizedCode = cleanSourceText(gameCode)
      .split('')
      .map((character) => {
        if (character === '\u0130' || character === '\u0131') {
          return 'I';
        }

        return character;
      })
      .join('')
      .trim()
      .replace(/\s+/g, '')
      .replace(/ABL\/P0F/gi, 'ABL/PO')
      .replace(/ABL\/POF/gi, 'ABL/PO')
      .replace(/ABL\/P0/gi, 'ABL/PO')
      .replace(/ABL\/P[I\u0130\u0131]/gi, 'ABL/PI')
      .replace(/\/+/g, '/');

    const missingSeriesMatch = normalizedCode.match(/^ABL\/P-(\d+)$/i);
    if (!missingSeriesMatch) {
      return normalizedCode;
    }

    const gameNumber = Number(missingSeriesMatch[1]);
    if (Number.isFinite(gameNumber) && gameNumber >= 121 && gameNumber <= 128) {
      return `ABL/PI-${gameNumber}`;
    }

    return `ABL/PO-${missingSeriesMatch[1]}`;
  })();

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
