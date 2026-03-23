import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TEMPLATE_FILE = 'Teyinat ABL_RS_115_116_117_118_119_120.docx';
export const DEFAULT_TEMPLATE_PATH =
  process.env.TEYINAT_TEMPLATE_PATH || path.join(__dirname, '..', 'games', DEFAULT_TEMPLATE_FILE);

const GROUP_CAPACITY = 3;
const MAX_SELECTIONS = 6;

const GROUP_B_HEADING = [23, 24, 25];
const GROUP_A_HEADING = [125, 126, 127];

const SLOT_LAYOUTS = [
  {
    code: [26, 27, 28],
    date: [31, 32, 33, 34, 35],
    time: [37, 38, 39, 40, 41],
    summary: [43, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
    roleLabels: [55, 58, 60],
    roleNames: [56, 59, 61],
  },
  {
    code: [62, 63],
    date: [66, 67, 68, 69, 70],
    time: [72, 73, 74],
    summary: [76, 78, 79, 80, 82, 83, 84, 85, 87, 88],
    roleLabels: [89, 92, 94],
    roleNames: [90, 93, 95],
  },
  {
    code: [96, 97],
    date: [100, 101, 102, 103, 104],
    time: [106, 107, 108],
    summary: [110, 112, 113, 114, 115, 116, 117],
    roleLabels: [118, 121, 123],
    roleNames: [119, 122, 124],
  },
  {
    code: [128, 129, 130],
    date: [133, 134, 135, 136, 137, 138],
    time: [140, 141, 142],
    summary: [144, 145, 146, 147, 148, 149, 150, 151],
    roleLabels: [152, 155, 157],
    roleNames: [153, 156, 158],
  },
  {
    code: [159, 160],
    date: [163, 164, 165, 166, 167],
    time: [169, 170, 171],
    summary: [173, 175, 176, 177, 178, 179, 180],
    roleLabels: [182, 185, 187],
    roleNames: [183, 186, 188],
  },
  {
    code: [189, 190],
    date: [193, 194, 195, 196, 197],
    time: [199, 200, 201],
    summary: [203, 205, 206, 207, 208, 209, 210, 211],
    roleLabels: [213, 216, 218],
    roleNames: [214, 217, 219],
  },
];

const normalizeFileToken = (value) =>
  String(value || '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const pad = (value) => String(value).padStart(2, '0');

const formatDate = (matchDate) => {
  const [year, month, day] = String(matchDate || '').split('-');
  if (!year || !month || !day) {
    return String(matchDate || '');
  }

  return `${pad(day)}.${pad(month)}.${year}`;
};

const formatTime = (matchTime) => String(matchTime || '').slice(0, 5);

const getSlotName = (nomination, slotNumber) =>
  nomination.referees.find((referee) => Number(referee.slotNumber) === slotNumber)?.refereeName || '';

const sortNominations = (items) =>
  items
    .slice()
    .sort((left, right) => `${left.matchDate}T${left.matchTime}`.localeCompare(`${right.matchDate}T${right.matchTime}`));

const partitionSelections = (selections) => {
  const groupA = sortNominations(selections.filter((item) => item.group === 'A').map((item) => item.nomination));
  const groupB = sortNominations(selections.filter((item) => item.group === 'B').map((item) => item.nomination));
  return { groupA, groupB };
};

export const validateSelections = (selections) => {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error('Choose at least one game.');
  }

  if (selections.length > MAX_SELECTIONS) {
    throw new Error('You can export up to 6 games.');
  }

  const { groupA, groupB } = partitionSelections(selections);
  if (groupA.length > GROUP_CAPACITY || groupB.length > GROUP_CAPACITY) {
    throw new Error('The original Word template supports up to 3 games in Group A and 3 games in Group B.');
  }

  return { groupA, groupB };
};

const setNodeText = (textNodes, index, value) => {
  if (!textNodes[index]) {
    throw new Error(`Template text node ${index} was not found.`);
  }

  textNodes[index].textContent = value;
};

const fillMultiNodeField = (textNodes, indexes, value) => {
  indexes.forEach((index, position) => {
    setNodeText(textNodes, index, position === 0 ? value : '');
  });
};

const fillHeading = (textNodes, indexes, label) => {
  const parts = label ? [`${label} `, 'Qrup', 'u'] : ['', '', ''];
  indexes.forEach((index, position) => {
    setNodeText(textNodes, index, parts[position] || '');
  });
};

const fillSlot = (textNodes, layout, nomination) => {
  if (!nomination) {
    [...layout.code, ...layout.date, ...layout.time, ...layout.summary, ...layout.roleLabels, ...layout.roleNames].forEach(
      (index) => setNodeText(textNodes, index, ''),
    );
    return;
  }

  fillMultiNodeField(textNodes, layout.code, nomination.gameCode || '');
  fillMultiNodeField(textNodes, layout.date, formatDate(nomination.matchDate));
  fillMultiNodeField(textNodes, layout.time, formatTime(nomination.matchTime));
  fillMultiNodeField(textNodes, layout.summary, `${nomination.teams}, ${nomination.venue}`);

  const roleLabels = ['Baş hakim               ', 'Hakim1                   ', '                                               Hakim2                   '];
  layout.roleLabels.forEach((index, position) => {
    setNodeText(textNodes, index, roleLabels[position] || '');
  });

  const roleNames = [getSlotName(nomination, 1), getSlotName(nomination, 2), getSlotName(nomination, 3)];
  layout.roleNames.forEach((index, position) => {
    setNodeText(textNodes, index, roleNames[position] || '');
  });
};

export const buildOutputFileName = (selections) => {
  const codes = selections
    .map((item) => normalizeFileToken(item.nomination?.gameCode || ''))
    .filter(Boolean)
    .slice(0, MAX_SELECTIONS);

  return `Teyinat_${codes.join('_') || 'Games'}.pdf`;
};

export const generateTeyinatDocx = async (selections, templatePath = DEFAULT_TEMPLATE_PATH) => {
  const { groupA, groupB } = validateSelections(selections);
  const templateBuffer = await fs.readFile(templatePath);
  const zip = new PizZip(templateBuffer);
  const documentXml = zip.file('word/document.xml')?.asText();

  if (!documentXml) {
    throw new Error('Word template document.xml was not found.');
  }

  const xml = new DOMParser().parseFromString(documentXml, 'text/xml');
  const textNodes = Array.from(xml.getElementsByTagName('w:t'));

  fillHeading(textNodes, GROUP_B_HEADING, groupB.length ? 'B' : '');
  fillHeading(textNodes, GROUP_A_HEADING, groupA.length ? 'A' : '');

  const ordered = [...groupB, ...groupA];
  SLOT_LAYOUTS.forEach((layout, index) => {
    fillSlot(textNodes, layout, ordered[index] || null);
  });

  const nextXml = new XMLSerializer().serializeToString(xml);
  zip.file('word/document.xml', nextXml);

  return zip.generate({ type: 'nodebuffer' });
};
