import { writeFileSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

/* ── Source name → short code map ─────────────────────────────── */

const SOURCE_MAP = {
  "Player's Handbook": 'PHB',
  "Xanathar's Guide to Everything": 'XGE',
  "Tasha's Cauldron of Everything": 'TCE',
  "Volo's Guide to Monsters": 'VGM',
  "Mordenkainen's Tome of Foes": 'MToF',
  "Dungeon Master's Guide": 'DMG',
  "Fizban's Treasury of Dragons": 'FToD',
  "Sword Coast Adventurer's Guide": 'SAiG',
  "Explorer's Guide to Wildemount": 'EGW',
  "Eberron: Rising from the Last War": 'ERftLW',
  "Guildmasters' Guide to Ravnica": 'GGtR',
  "Mythic Odysseys of Theros": 'MOoT',
  "Tales from the Yawning Portal": 'TftYP',
  "Ghosts of Saltmarsh": 'GoS',
  "The Rise of Tiamat": 'ToD',
  "Tyranny of Dragons": 'TftD',
  "Curse of Strahd": 'CoS',
  "Out of the Abyss": 'OotA',
  "Storm King's Thunder": 'SKT',
  "Waterdeep: Dragon Heist": 'WDH',
  "Waterdeep: Dungeon of the Mad Mage": 'WDMM',
  "Hoard of the Dragon Queen": 'HotDQ',
  "Princes of the Apocalypse": 'PotA',
  "Acquisitions Incorporated": 'AI',
  "Van Richten's Guide to Ravenloft": 'VRGR',
  "Candlekeep Mysteries": 'CM',
  "The Wild Beyond the Witchlight": 'WBtW',
  "Icewind Dale: Rime of the Frostmaiden": 'IDRotF',
  "Elemental Evil Player's Companion": 'EEPC',
  "Mordenkainen Presents: Monsters of the Multiverse": 'MPMM',
  "Monsters of the Multiverse": 'MPMM',
  "Bigby Presents: Glory of the Giants": 'BGG',
  "The Book of Many Things": 'TBoMT',
  "Spelljammer: Adventures in Space": 'SAiS',
  "Dragonlance: Shadow of the Dragon Queen": 'DSotDQ',
  "Keys from the Golden Vault": 'KftGV',
  "Journeys through the Radiant Citadel": 'JttRC',
  "Planescape: Adventures in the Multiverse": 'PAitM',
  "Vecna: Eve of Ruin": 'VEoR',
  "Strixhaven: A Curriculum of Chaos": 'SaCoC',
  "Theros": 'MOoT',
  "Unearthed Arcana": 'UA',
  "DND Beyond": 'HB',
  "D&D Beyond": 'HB',
  "Sage Advice Compendulum": 'SAC',
  "OneD&D Playtest": 'UA',
};

const OFFICIAL_SHORT = new Set(Object.values(SOURCE_MAP).filter(v => v !== 'UA' && v !== 'HB'));

const HR_RE = /^-{4,}$/;

/* ── Ordinal to number ────────────────────────────────────────── */

const ORDINALS = {
  'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
  'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5, 'sixth': 6, '6th': 6,
  'seventh': 7, '7th': 7, 'eighth': 8, '8th': 8, 'ninth': 9, '9th': 9,
  'tenth': 10, '10th': 10, 'eleventh': 11, '11th': 11, 'twelfth': 12, '12th': 12,
  'thirteenth': 13, '13th': 13, 'fourteenth': 14, '14th': 14, 'fifteenth': 15, '15th': 15,
  'sixteenth': 16, '16th': 16, 'seventeenth': 17, '17th': 17, 'eighteenth': 18, '18th': 18,
  'nineteenth': 19, '19th': 19, 'twentieth': 20, '20th': 20,
};

export function ordinalToNum(s) {
  return ORDINALS[String(s).toLowerCase().replace(/[,.\s]/g, '')] ?? null;
}

export function normalizeSource(name) {
  if (!name) return 'SRD';
  let trimmed = name.replace(/\[.*?\]/g, (m) => {
    // [url Label] or [url] → label (text after the URL, which has no spaces) else ''
    const inner = m.slice(1, -1);
    const sp = inner.indexOf(' ');
    return sp > 0 ? inner.slice(sp + 1) : '';
  }).trim();
  if (!trimmed) trimmed = String(name);
  for (const [k, v] of Object.entries(SOURCE_MAP)) {
    if (trimmed.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'SRD';
}

/**
 * Find the table header row: the row with the most ~-prefixed cells.
 * Falls back to the first row containing a ~-prefixed cell.
 */
export function findHeaderRow(rows) {
  let best = -1;
  let bestCount = 1;
  for (let i = 0; i < rows.length; i++) {
    const count = rows[i].filter(c => /^~/.test(c)).length;
    if (count > bestCount) {
      bestCount = count;
      best = i;
    }
  }
  if (best === -1) {
    best = rows.findIndex(r => r.some(c => /^~/.test(c)));
  }
  return { headerIdx: best, headerCount: bestCount };
}

export function isOfficialSource(short) {
  return OFFICIAL_SHORT.has(short);
}

/* ── Title / Source extraction ─────────────────────────────────── */

export function parseTitleSource(txt) {
  let name = '';
  let source = 'SRD';
  const lines = txt.split(/\r?\n/).slice(0, 20);
  for (const line of lines) {
    if (line.startsWith('title:')) { name = line.slice(6).trim(); continue; }
    if (line.startsWith('Source:')) {
      source = normalizeSource(line.slice(7).trim());
      break;
    }
  }
  return { name, source };
}

/* ── Inline markup → HTML ──────────────────────────────────────── */

export function inline(s) {
  if (!s) return '';
  let t = s;

  // Nested [[[url|Label]]] → label (must run before double-bracket form)
  t = t.replace(/\[\[\[([^\]|]+?)\|([^\]]+?)\]\]\]/g, '$2');
  t = t.replace(/\[\[\[([^\]]+?)\]\]\]/g, '$1');

  // Wiki links [[url|Label]] → label
  t = t.replace(/\[\[([^\]|]+?)\|([^\]]+?)\]\]/g, '$2');

  // External links [http://url Label] → Label, or [http://url]
  t = t.replace(/\[https?:\/\/[^\s\]]+(?:\s+([^\]]+))?\]/g, (m, label) => label || '');

  // Hover spans: [[span class="hover"]]VISIBLE[[span]]TOOLTIP[[/span]][[/span]]
  t = t.replace(/\[\[span\s+class="hover"\]\]([\s\S]*?)\[\[span\]\][\s\S]*?\[\[\/span\]\][\s\S]*?\[\[\/span\]\]/g, '$1');
  // Strip remaining span tags
  t = t.replace(/\[\[span[^\]]*\]\]/g, '');
  t = t.replace(/\[\[\/span\]\]/g, '');

  // Size spans
  t = t.replace(/\[\[size[^\]]*\]\]/g, '');
  t = t.replace(/\[\[\/size\]\]/g, '');

  // Collapse/uncollapse
  t = t.replace(/\[\[collapsible[^\]]*\]\]/g, '');
  t = t.replace(/\[\[\/collapsible\]\]/g, '');

  // Italic //...//
  t = t.replace(/\/\/([^/][\s\S]*?)\/\//g, '<i>$1</i>');

  // Bold **...**
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // Remove any leftover [[ ]] tags
  t = t.replace(/\[\[[^\]]*?\]\]/g, '');

  // Collapse whitespace
  t = t.replace(/\s{2,}/g, ' ').trim();

  return t;
}

/* ── Block-level parsing ───────────────────────────────────────── */

function parseTableLine(line) {
  const trimmed = line.trim();
  if (!/^\|\|/.test(trimmed) || !/\|\|\s*$/.test(trimmed)) return null;
  const inner = trimmed.replace(/^\|\||\|\|$/g, '');
  return inner.split('||').map(c => inline(c.trim()));
}

function isTableLine(line) {
  return /^\|\|.*\|\|\s*$/.test(line.trim());
}

function flushText(textLines, out) {
  if (!textLines.length) return;
  const joined = textLines.join('\n');
  // Split into paragraphs by blank lines (but we may have removed blanks)
  // Treat consecutive non-empty lines as a paragraph
  const paragraphs = joined.split(/\n{2,}/);
  for (const p of paragraphs) {
    const content = inline(p.replace(/\n/g, ' ')).trim();
    if (content) out.push({ type: 'text', content });
  }
}

function flushTable(tableLines, out) {
  if (!tableLines.length) return;
  const rows = tableLines.map(parseTableLine).filter(Boolean);
  if (!rows.length) return;

  let colLabels = [];
  let dataRows = [...rows];

  // Find header row: the row with the most ~-prefixed cells
  const { headerIdx, headerCount } = findHeaderRow(rows);
  if (headerIdx !== -1 && rows[headerIdx].some(c => /^~/.test(c))) {
    colLabels = rows[headerIdx].map(c => String(c).replace(/^~\s*/, '').trim());
    dataRows.splice(headerIdx, 1);
    // Drop title rows (rows with few ~ cells that are mostly empty)
    colLabels = colLabels.filter(c => c);
  }

  // Filter empty rows
  dataRows = dataRows.filter(r => r.some(c => c && !/^~/.test(c)));

  if (dataRows.length) {
    out.push({ type: 'table', colLabels, rows: dataRows });
  }
}

function flushBullets(bulletLines, out) {
  if (!bulletLines.length) return;
  const items = bulletLines.map(l => {
    const content = inline(l.replace(/^\s*\*\s+/, ''));
    return content;
  });
  out.push({ type: 'list', items });
}

/**
 * Parse a full wikidot text into entries[] array.
 * Supports headings (+, ++, +++, etc.), tables (||), bullet lists (*), paragraphs.
 */
export function blocksToEntries(txt) {
  if (!txt || !txt.trim()) return [];
  const lines = txt.split(/\r?\n/);
  const HEAD_RE = /^(\+{1,6})\s+(.*)$/;
  const TAG_LINE_RE = /^\[\[[^\]]*\]\]$/;
  const TAG_CLOSE_RE = /^\[\[\/[^\]]*\]\]$/;
  const HR_RE = /^-{4,}$/;
  const SEPARATOR_RE = /^={4,}$/;

  const root = [];
  const stack = [{ depth: 0, entries: root }];
  let textBuf = [];
  let tableBuf = [];
  let bulletBuf = [];

  function flushPending() {
    if (bulletBuf.length) { flushBullets(bulletBuf, current().entries); bulletBuf = []; }
    if (tableBuf.length)  { flushTable(tableBuf, current().entries); tableBuf = []; }
    if (textBuf.length)   { flushText(textBuf, current().entries); textBuf = []; }
  }

  function current() {
    return stack[stack.length - 1];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip artifacts
    if (!line) {
      // Blank line: flush pending text only
      if (textBuf.length) flushText(textBuf, current().entries);
      textBuf = [];
      continue;
    }
    if (HR_RE.test(line) || SEPARATOR_RE.test(line)) {
      flushPending();
      continue;
    }
    // Tag-only lines: drop
    if (TAG_LINE_RE.test(line) || TAG_CLOSE_RE.test(line)) continue;

    // Comment / module / include
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;

    // Heading
    const hm = line.match(HEAD_RE);
    if (hm) {
      flushPending();
      const depth = hm[1].length;
      const name = inline(hm[2]).trim();

      // Pop stack to appropriate parent
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      // Also pop empty sections (no entries)
      while (stack.length > 1 && stack[stack.length - 1].entries.length === 0 && stack[stack.length - 1].depth > 0) {
        stack.pop();
      }

      const section = { type: 'section', name, entries: [] };
      stack[stack.length - 1].entries.push(section);
      stack.push({ depth, entries: section.entries });
      continue;
    }

    // Table line
    if (isTableLine(line)) {
      flushPending();
      tableBuf.push(line);
      continue;
    }

    // Bullet line (allow leading spaces for sub-bullets)
    if (/^\s*\*\s/.test(line)) {
      // Flush table if switching from table to bullets
      if (tableBuf.length) {
        flushPending();
      }
      bulletBuf.push(line);
      continue;
    }

    // Sub-bullet (indented * ): treat as part of previous bullet item
    if (/^\s+\*\s/.test(line) && bulletBuf.length) {
      // Append as continuation of last bullet item
      bulletBuf[bulletBuf.length - 1] += ' ' + inline(line.replace(/^\s+\*\s+/, ''));
      continue;
    }

    // Text line
    if (bulletBuf.length) {
      // Flush bullets before text
      flushBullets(bulletBuf, current().entries);
      bulletBuf = [];
    }
    if (tableBuf.length) {
      flushTable(tableBuf, current().entries);
      tableBuf = [];
    }
    textBuf.push(line);
  }

  flushPending();

  // Clean up: remove empty sections and flatten single-child sections
  const clean = (arr) =>
    arr
      .filter(e => !(e.type === 'section' && e.entries.length === 0))
      .map(e => e.type === 'section' ? { ...e, entries: clean(e.entries) } : e);

  return clean(root);
}

/* ── Spell-specific parsers ────────────────────────────────────── */

export function parseLevelSchool(line) {
  // e.g. "//3rd-level evocation//" or "//Conjuration cantrip//" or "//1st-level conjuration (ritual)//"
  const m = line.match(/\/{2}(?:cantrip|(\d+)(?:st|nd|rd|th)-level\s+)(\w+)(?:\s*\(ritual\))?\/{2}/i);
  if (!m) return null;
  if (line.toLowerCase().includes('cantrip')) {
    return { level: 0, school: schoolCode(line.split(/\s+/)[0]), ritual: false };
  }
  return {
    level: parseInt(m[1], 10),
    school: schoolCode(m[2]),
    ritual: /\(ritual\)/i.test(line),
  };
}

function schoolCode(word) {
  const map = { abjuration: 'A', conjuration: 'C', divination: 'D', enchantment: 'E', evocation: 'V', illusion: 'I', necromancy: 'N', transmutation: 'T' };
  return map[word.toLowerCase()] || word[0].toUpperCase();
}

export function parseBoldProps(txt) {
  const props = {};
  const re = /\*\*(.+?):\*\*\s*(.*)/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    props[m[1].trim()] = m[2].trim();
  }
  return props;
}

export function parseCastingTime(s) {
  if (!s) return [{ number: 1, unit: 'action' }];
  const l = s.toLowerCase();
  if (l.includes('bonus action')) return [{ number: 1, unit: 'bonus' }];
  if (l.includes('reaction')) return [{ number: 1, unit: 'reaction' }];
  const m = l.match(/(\d+)\s+(minute|hour|round|day)/);
  if (m) {
    const unitMap = { minute: 'minute', hour: 'hour', round: 'round', day: 'day' };
    return [{ number: parseInt(m[1], 10), unit: unitMap[m[2]] || m[2] }];
  }
  return [{ number: 1, unit: 'action' }];
}

export function parseRange(s) {
  if (!s) return { type: 'point', distance: { type: 'feet', amount: 0 } };
  const l = s.toLowerCase().trim();
  if (l === 'self') return { type: 'self' };
  if (l === 'touch') return { type: 'touch' };
  if (l === 'special') return { type: 'special' };
  if (l === 'unlimited') return { type: 'unlimited' };
  if (l === 'sight') return { type: 'sight' };

  const mSelf = l.match(/self\s*\((\d+)-foot\s+(radius|cone|line|cylinder|sphere|cube)\)/);
  if (mSelf) {
    return { type: 'self', selfType: mSelf[2], distance: { type: 'feet', amount: parseInt(mSelf[1], 10) } };
  }

  const mFeet = l.match(/(\d+)\s+feet/);
  if (mFeet) {
    const distance = parseInt(mFeet[1], 10);
    if (/radius|sphere/i.test(l)) return { type: 'radius', distance: { type: 'feet', amount: distance } };
    if (/cone/i.test(l)) return { type: 'cone', distance: { type: 'feet', amount: distance } };
    if (/line/i.test(l)) return { type: 'line', distance: { type: 'feet', amount: distance } };
    if (/cylinder/i.test(l)) return { type: 'cylinder', distance: { type: 'feet', amount: distance } };
    return { type: 'point', distance: { type: 'feet', amount: distance } };
  }

  const mMiles = l.match(/(\d+)\s+miles?/);
  if (mMiles) return { type: 'point', distance: { type: 'miles', amount: parseInt(mMiles[1], 10) } };

  return { type: 'point', distance: { type: 'feet', amount: 0 } };
}

export function parseComponents(s) {
  if (!s) return {};
  const parts = {};
  const upper = s.toUpperCase();
  if (/\bV\b/.test(upper)) parts.v = true;
  if (/\bS\b/.test(upper)) parts.s = true;
  if (/\bM\b/.test(upper)) {
    const mText = s.match(/M\s*\(([^)]+)\)/);
    parts.m = mText ? mText[1].trim() : true;
  }
  return parts;
}

export function parseDuration(s) {
  if (!s) return [];
  const l = s.toLowerCase().trim();
  const concentration = /\(concentration\)/i.test(s) || /concentration/i.test(l);

  if (/instantaneous/i.test(l)) return [{ type: 'instant' }];
  if (/special/i.test(l)) return [{ type: 'special' }];
  if (/until dispelled/i.test(l)) return [{ type: 'permanent' }];

  const m = s.match(/(\d+)\s+(round|minute|hour|day)/i);
  if (m) {
    const unitMap = { round: 'round', minute: 'minute', hour: 'hour', day: 'day' };
    return [{ type: 'timed', concentration, duration: { amount: parseInt(m[1], 10), type: unitMap[m[2].toLowerCase()] || m[2].toLowerCase() } }];
  }

  return [{ type: 'special' }];
}

/* ── Race/Lineage parsers ──────────────────────────────────────── */

export function parseLineage(txt, name) {
  const lines = txt.split(/\r?\n/);
  const HEAD_RE = /^(\+{1,6})\s+(.*)$/;

  const result = {
    name,
    source: 'SRD',
    edition: 'classic',
    size: [],
    speed: { walk: 30 },
    ability: [],
    languages: [],
    traits: [],
    entries: [],
    skillProficiencies: null,
  };

  let currentBulletName = null;
  let currentBulletContent = [];
  let flavorLines = [];
  let inFlavor = true;

  function flushBullet() {
    if (currentBulletName && currentBulletContent.length) {
      result.traits.push({
        name: currentBulletName,
        text: inline(currentBulletContent.join(' ')),
      });
    }
    currentBulletName = null;
    currentBulletContent = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('title:')) {
      const titleSource = parseTitleSource(rawLine + '\n' + lines.slice(lines.indexOf(rawLine) + 1, lines.indexOf(rawLine) + 15).join('\n'));
      result.source = titleSource.source || 'SRD';
      continue;
    }
    if (line.startsWith('Source:')) {
      result.source = normalizeSource(line.slice(7).trim());
      continue;
    }
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line)) continue;
    if (/^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (/^-{4,}$/.test(line) || /^={4,}$/.test(line)) continue;

    // Heading (not used in lineage bullets usually, but handle)
    const hm = line.match(HEAD_RE);
    if (hm) {
      flushBullet();
      continue;
    }

    // Flavor text in bold italics at top
    if (/^\*\*\/\//.test(line)) {
      const clean = line.replace(/\*\*\/?\/?\*\*/g, '').replace(/^\/\//, '').replace(/\/\/$/, '').trim();
      if (clean) flavorLines.push(clean);
      inFlavor = true;
      continue;
    }

    // Bullet with bold name: * **Name.** content
    const bulletM = line.match(/^\s*\*\s+\*\*(.+?)\*\*\s*(.*)/);
    if (bulletM) {
      flushBullet();
      inFlavor = false;
      currentBulletName = bulletM[1].replace(/\.$/, '').trim();
      const content = bulletM[2].trim();
      if (content) currentBulletContent.push(content);

      // Extract structured fields from known bullets
      const nameLower = currentBulletName.toLowerCase();
      if (nameLower.includes('size')) {
        const sizeText = content.toLowerCase();
        if (sizeText.includes('small') && sizeText.includes('medium')) result.size = ['M', 'S'];
        else if (sizeText.includes('small')) result.size = ['S'];
        else if (sizeText.includes('medium')) result.size = ['M'];
        else if (sizeText.includes('large')) result.size = ['L'];
      } else if (nameLower.includes('speed')) {
        const speedM = content.match(/(\d+)\s+feet/);
        if (speedM) result.speed = { walk: parseInt(speedM[1], 10) };
      } else if (nameLower.includes('language')) {
        // Parse language names
        const langText = content.toLowerCase();
        const langs = [];
        if (langText.includes('common')) langs.push('Common');
        if (langText.includes('elvish')) langs.push('Elvish');
        if (langText.includes('draconic')) langs.push('Draconic');
        if (langText.includes('goblin')) langs.push('Goblin');
        if (langText.includes('sylvan')) langs.push('Sylvan');
        if (langText.includes('dwarvish')) langs.push('Dwarvish');
        if (langText.includes('dwarven')) langs.push('Dwarvish');
        if (langText.includes('gnomish')) langs.push('Gnomish');
        if (langText.includes('halfling')) langs.push('Halfling');
        if (langText.includes('orcish')) langs.push('Orc');
        if (langText.includes('orc')) langs.push('Orc');
        if (langText.includes('infernal')) langs.push('Infernal');
        if (langText.includes('celestial')) langs.push('Celestial');
        if (langText.includes('abyssal')) langs.push('Abyssal');
        if (langText.includes('primordial')) langs.push('Primordial');
        if (langText.includes('giant')) langs.push('Giant');
        if (langText.includes('undercommon')) langs.push('Undercommon');
        if (langText.includes('deep speech')) langs.push('Deep Speech');
        if (langText.includes('auran')) langs.push('Auran');
        if (langText.includes('terran')) langs.push('Terran');
        if (langText.includes('aquan')) langs.push('Aquan');
        if (langText.includes('ignan')) langs.push('Ignan');
        result.languages = langs;
      } else if (nameLower.includes('ability score')) {
        // Parse generic MMotM-style: "increase one score by 2 and increase a different by 1"
        if (content.includes('one score by 2 and increase a different score by 1')) {
          result.ability = [{ choose: { from: ['str', 'dex', 'con', 'int', 'wis', 'cha'], count: 2 } }];
        } else {
          // Try to parse specific: "+2 to Dexterity, +1 to Wisdom"
          const specific = content.match(/\+(\d)\s+to\s+(\w+)/gi);
          if (specific) {
            const ability = {};
            for (const s of specific) {
              const m2 = s.match(/\+(\d)\s+to\s+(\w+)/i);
              if (m2) {
                const stat = m2[2].toLowerCase().slice(0, 3);
                ability[stat] = parseInt(m2[1], 10);
              }
            }
            if (Object.keys(ability).length) result.ability = [ability];
          }
        }
      } else if (nameLower.includes('skill') && nameLower.includes('proficien')) {
        // Parse skill proficiencies
        const skills = [];
        const skillNames = ['acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'];
        for (const sk of skillNames) {
          if (content.toLowerCase().includes(sk)) skills.push(sk);
        }
        if (skills.length) result.skillProficiencies = skills.reduce((a, s) => ({ ...a, [s.replace(/\s+/g, '-')]: true }), {});
      }
      continue;
    }

    // Sub-bullet (indented * ): continuation of previous trait
    if (/^\s+\*\s/.test(line) && currentBulletName) {
      currentBulletContent.push(inline(line.replace(/^\s+\*\s+/, '')));
      continue;
    }

    // Regular text line
    if (currentBulletName) {
      currentBulletContent.push(inline(line));
    }
  }

  flushBullet();

  // Set flavor text as first entries if present
  if (flavorLines.length) {
    result.entries.unshift({ type: 'text', content: flavorLines.map(l => `<i>${l}</i>`).join(' ') });
  }

  // Convert traits to entries
  if (result.traits.length) {
    result.entries.push({
      type: 'list',
      items: result.traits.map(t => ({
        type: 'item',
        name: `${t.name}.`,
        entry: t.text,
      })),
    });
    // 5etools-style: traits as name tags for the Races browser
    result.traits = result.traits.map(t => t.name);
  }

  // 5etools-style: languages as {[lang]: true} objects
  result.languages = result.languages.map(l => ({ [l.toLowerCase()]: true }));

  return result;
}

/* ── Background parser ─────────────────────────────────────────── */

export function parseBackground(txt, name) {
  const lines = txt.split(/\r?\n/);
  const result = {
    name,
    source: 'SRD',
    skillProficiencies: null,
    toolProficiencies: null,
    feats: [],
    startingEquipment: [],
    entries: [],
    languageProficiencies: null,
  };

  let flavorLines = [];
  let bulletBuf = [];

  function flushBullets() {
    if (bulletBuf.length) {
      result.entries.push({
        type: 'list',
        items: bulletBuf.map(b => ({
          type: 'item',
          name: b.name + '.',
          entry: b.entry,
        })),
      });
      bulletBuf = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('title:')) {
      const titleName = line.slice(6).trim().replace(/^Background:\s*/i, '');
      if (titleName) result.name = titleName;
      continue;
    }
    if (line.startsWith('Source:')) {
      result.source = normalizeSource(line.slice(7).trim());
      continue;
    }
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line) || /^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (/^-{4,}$/.test(line) || /^={4,}$/.test(line)) continue;

    // Flavor text
    if (/^\*\*\/\//.test(line)) {
      const clean = line.replace(/\*\*\/?\/?\*\*/g, '').replace(/^\/\//, '').replace(/\/\/$/, '').trim();
      if (clean) flavorLines.push(clean);
      continue;
    }

    // Bold property lines: **Skill Proficiencies:** ...
    const propM = line.match(/^\*\*(.+?):\*\*\s*(.*)/);
    if (propM) {
      flushBullets();
      const propName = propM[1].trim().toLowerCase();
      const propVal = propM[2].trim();

      if (propName.includes('skill proficien')) {
        const skills = {};
        const skillNames = ['acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'];
        for (const sk of skillNames) {
          if (propVal.toLowerCase().includes(sk)) skills[sk.replace(/\s+/g, '-')] = true;
        }
        result.skillProficiencies = Object.keys(skills).length ? [skills] : null;
      } else if (propName.includes('tool proficien')) {
        if (propVal.toLowerCase() === 'none') {
          result.toolProficiencies = null;
        } else {
          const tools = {};
          for (const t of propVal.split(/,\s*/)) {
            const clean = t.trim().toLowerCase().replace(/ kit$/i, '');
            if (clean && clean !== 'none') tools[clean + ' kit'] = true;
          }
          result.toolProficiencies = Object.keys(tools).length ? [tools] : null;
        }
      } else if (propName.includes('language')) {
        if (propVal.toLowerCase().includes('two of your choice') || propVal.toLowerCase().includes('any two')) {
          result.languageProficiencies = [{ anyStandard: 2 }];
        } else if (propVal.toLowerCase().includes('any')) {
          result.languageProficiencies = [{ anyStandard: true }];
        }
      }
      continue;
    }

    // Bullets with bold names
    const bulletM = line.match(/^\s*\*\s+\*\*(.+?)\*\*\s*(.*)/);
    if (bulletM) {
      flushBullets();
      bulletBuf.push({ name: bulletM[1].replace(/\.$/, '').trim(), entry: inline(bulletM[2]) });
      continue;
    }

    // Regular text
    if (line) {
      flushBullets();
      flavorLines.push(line);
    }
  }

  flushBullets();

  if (flavorLines.length) {
    result.entries.unshift({ type: 'text', content: flavorLines.map(l => `<i>${l}</i>`).join(' ') });
  }

  return result;
}

/* ── Spell parser ──────────────────────────────────────────────── */

export function parseSpell(txt, name) {
  const result = {
    name,
    source: 'SRD',
    level: 0,
    school: 'V',
    time: [{ number: 1, unit: 'action' }],
    range: { type: 'point', distance: { type: 'feet', amount: 0 } },
    components: {},
    duration: [],
    ritual: false,
    concentration: false,
    entries: [],
    page: 0,
  };

  const lines = txt.split(/\r?\n/);
  let atHigherLevels = [];
  let inDescription = false;
  let descriptionLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('title:')) {
      result.name = line.slice(6).trim() || name;
      continue;
    }
    if (line.startsWith('Source:')) {
      result.source = normalizeSource(line.slice(7).trim());
      continue;
    }
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line) || /^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (/^-{4,}$/.test(line) || /^={4,}$/.test(line)) continue;

    // Level/school line: //3rd-level evocation// or //Conjuration cantrip//
    if (/^\/\//.test(line) && /\/$/.test(line)) {
      const parsed = parseLevelSchool(line);
      if (parsed) {
        result.level = parsed.level;
        result.school = parsed.school;
        result.ritual = parsed.ritual;
        continue;
      }
    }

    // Bold properties
    const propM = line.match(/^\*\*(.+?):\*\*\s*(.*)/);
    if (propM) {
      const prop = propM[1].trim().toLowerCase();
      const val = propM[2].trim();
      if (prop === 'casting time') result.time = parseCastingTime(val);
      else if (prop === 'range') result.range = parseRange(val);
      else if (prop === 'components') result.components = parseComponents(val);
      else if (prop === 'duration') {
        result.duration = parseDuration(val);
        result.concentration = result.duration.some(d => d.concentration);
      }
      inDescription = false;
      continue;
    }

    // At Higher Levels
    if (/^\/{2}At Higher Levels\.?\/{2}/i.test(line) || /^\*\*\/{2}At Higher Levels\.?\/{2}\*\*/i.test(line)) {
      inDescription = false;
      continue;
    }

    // Spell Lists
    if (/^\/{2}Spell Lists?\.?\/{2}/i.test(line) || /^\*\*\/{2}Spell Lists?\.?\/{2}\*\*/i.test(line)) {
      continue;
    }

    // Description text
    if (line) {
      descriptionLines.push(line);
    }
  }

  if (descriptionLines.length) {
    const entries = blocksToEntries(descriptionLines.join('\n'));
    result.entries = entries;
  }

  return result;
}

/* ── Feat parser ───────────────────────────────────────────────── */

export function parseFeat(txt, name) {
  const result = {
    name,
    source: 'SRD',
    prerequisite: null,
    entries: [],
    page: 0,
  };

  const lines = txt.split(/\r?\n/);
  let descLines = [];
  let bulletLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('title:')) { result.name = line.slice(6).trim() || name; continue; }
    if (line.startsWith('Source:')) { result.source = normalizeSource(line.slice(7).trim()); continue; }
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line) || /^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (/^-{4,}$/.test(line) || /^={4,}$/.test(line)) continue;
    if (line) descLines.push(line);
  }

  if (descLines.length) {
    result.entries = blocksToEntries(descLines.join('\n'));
  }
  return result;
}

/* ── Magic Item parser ─────────────────────────────────────────── */

export function parseMagicItem(txt, name) {
  const result = {
    name,
    source: 'SRD',
    type: 'Wondrous item',
    rarity: 'unknown',
    entries: [],
    reqAttune: false,
    wondrous: true,
    page: 0,
  };

  const lines = txt.split(/\r?\n/);
  let descLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('title:')) { result.name = line.slice(6).trim() || name; continue; }
    if (line.startsWith('Source:')) { result.source = normalizeSource(line.slice(7).trim()); continue; }
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line) || /^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (/^-{4,}$/.test(line) || /^={4,}$/.test(line)) continue;

    // Type/rarity line: //Wondrous item, uncommon//
    if (/^\/\//.test(line) && /\/$/.test(line)) {
      const clean = line.replace(/\/{2}/g, '').trim();
      const parts = clean.split(/,\s*/);
      if (parts.length >= 1) {
        result.type = parts[0].trim();
        result.wondrous = /wondrous/i.test(result.type);
      }
      if (parts.length >= 2) {
        result.rarity = parts[1].trim();
      }
      if (/attunement/i.test(clean)) result.reqAttune = true;
      continue;
    }

    if (line) descLines.push(line);
  }

  if (descLines.length) {
    result.entries = blocksToEntries(descLines.join('\n'));
  }
  return result;
}

/* ── Class parser ──────────────────────────────────────────────── */

const ABILITY_MAP = {
  'strength': 'str', 'dexterity': 'dex', 'constitution': 'con',
  'intelligence': 'int', 'wisdom': 'wis', 'charisma': 'cha',
};

export function parseClass(txt, name) {
  const result = {
    name,
    source: 'SRD',
    edition: 'classic',
    hitDice: { number: 1, faces: 8 },
    proficiency: [],
    savingThrows: [],
    startingProficiencies: { skills: [], weapons: [], armor: [], tools: [] },
    spellcastingAbility: null,
    subclassTitle: name,
    features: [],
    tables: [],
    classTableGroups: [],
    page: 0,
  };

  const lines = txt.split(/\r?\n/);
  let featureLevels = {};
  let levelTableLines = [];
  let inLevelTable = false;
  let allTextLines = [];

  // First pass: find the level table and extract feature levels
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (isTableLine(line)) {
      levelTableLines.push(line);
      inLevelTable = true;
    } else if (inLevelTable) {
      inLevelTable = false;
    }
  }

  // Parse the level table
  if (levelTableLines.length) {
    const rows = levelTableLines.map(parseTableLine).filter(Boolean);
    if (rows.length) {
      let colLabels = [];
      let dataRows = [...rows];
      const { headerIdx, headerCount } = findHeaderRow(rows);
      if (headerIdx !== -1 && rows[headerIdx].some(c => /^~/.test(c))) {
        colLabels = rows[headerIdx].map(c => String(c).replace(/^~\s*/, '').trim());
        dataRows.splice(headerIdx, 1);
        colLabels = colLabels.filter(c => c);
      }

      // Remove leading title rows (mostly-empty rows before the header)
      dataRows = dataRows.filter(r => r.some(c => c && !/^~/.test(c)));

      // Find Features column index
      const featColIdx = colLabels.findIndex(l => l.toLowerCase().includes('feature'));
      if (featColIdx !== -1) {
        for (const row of dataRows) {
          const levelStr = row[0]?.trim();
          if (!levelStr) continue;
          const levelM = levelStr.match(/(\d+)/);
          if (!levelM) continue;
          const level = parseInt(levelM[1], 10);
          const featCell = row[featColIdx] || '';
          const featureNames = featCell.split(/,\s*/).map(f =>
            f.replace(/\/{2}.*?\/{2}/g, '').replace(/\(Optional\)/gi, '').trim()
          ).filter(Boolean);
          for (const fname of featureNames) {
            if (!featureLevels[fname] || level < featureLevels[fname]) {
              featureLevels[fname] = level;
            }
          }
        }
      }

      // Keep only level rows (1st..20th); drop stray footer/subclass rows
      dataRows = dataRows.filter(r => /^\d{1,2}(st|nd|rd|th)\b/i.test((r[0] || '').trim()));

      result.tables = [{ title: `The ${name}`, colLabels, rows: dataRows }];
      result.classTableGroups = [{ title: `The ${name}`, colLabels, rows: dataRows }];
    }
  }

  // Second pass: extract all text for structured fields and features
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line) || /^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (HR_RE.test(line) || /^={4,}$/.test(line)) continue;
    if (line.startsWith('title:')) { continue; }

    // Source
    if (line.startsWith('Source:')) {
      result.source = normalizeSource(line.slice(7).trim());
      continue;
    }

    allTextLines.push(line);
  }

  const fullText = allTextLines.join('\n');

  // Extract Hit Dice
  const hitDiceM = fullText.match(/\*\*Hit Dice:\*\*\s*(\d+)d(\d+)/);
  if (hitDiceM) {
    result.hitDice = { number: parseInt(hitDiceM[1], 10), faces: parseInt(hitDiceM[2], 10) };
  }

  // Extract Saving Throws
  const savesM = fullText.match(/\*\*Saving Throws:\*\*\s*(.+)/);
  if (savesM) {
    result.savingThrows = savesM[1].split(/,\s*/).map(s => ABILITY_MAP[s.trim().toLowerCase()] || s.trim().toLowerCase().slice(0, 3));
  }

  // Extract Skills
  const skillsM = fullText.match(/\*\*Skills:\*\*\s*(.+)/);
  if (skillsM) {
    const skillText = skillsM[1];
    const countM = skillText.match(/(?:choose|any)\s+(\d+|two|three|four)/i);
    const countMap = { two: 2, three: 3, four: 4 };
    const count = countM ? (countMap[countM[1].toLowerCase()] || parseInt(countM[1], 10) || 2) : 2;
    const skillNames = ['acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'];
    const available = skillNames.filter(sk => skillText.toLowerCase().includes(sk));
    if (available.length) {
      result.startingProficiencies.skills = [{ choose: { from: available.map(s => s.replace(/\s+/g, '-')), count } }];
    }
  }

  // Armor/Weapons/Tools
  const armorM = fullText.match(/\*\*Armor:\*\*\s*(.+)/);
  if (armorM) {
    const armorText = armorM[1].toLowerCase();
    if (!armorText.includes('none')) {
      const armors = [];
      if (armorText.includes('light')) armors.push('light');
      if (armorText.includes('medium')) armors.push('medium');
      if (armorText.includes('heavy')) armors.push('heavy');
      if (armorText.includes('shield')) armors.push('shield');
      result.startingProficiencies.armor = armors;
    }
  }

  const weaponsM = fullText.match(/\*\*Weapons:\*\*\s*(.+)/);
  if (weaponsM) {
    const weaponText = weaponsM[1].toLowerCase();
    const weapons = [];
    if (weaponText.includes('simple')) weapons.push('simple');
    if (weaponText.includes('martial')) weapons.push('martial');
    result.startingProficiencies.weapons = weapons;
  }

  const toolsM = fullText.match(/\*\*Tools:\*\*\s*(.+)/);
  if (toolsM) {
    const toolsText = toolsM[1];
    if (!toolsText.toLowerCase().includes('none')) {
      result.startingProficiencies.tools = [toolsText.trim()];
    }
  }

  // Spellcasting ability
  const scAbilityM = fullText.match(/([A-Z][a-z]+)\s+is your spellcasting ability/i);
  if (scAbilityM) {
    result.spellcastingAbility = ABILITY_MAP[scAbilityM[1].toLowerCase()] || scAbilityM[1].toLowerCase().slice(0, 3);
  }

  // Parse features from headings
  const HEAD_RE = /^(\+{1,6})\s+(.*)$/;
  let currentFeature = null;
  let currentFeatureLines = [];

  function flushFeature() {
    if (currentFeature) {
      currentFeature.entries = blocksToEntries(currentFeatureLines.join('\n'));
      result.features.push(currentFeature);
    }
    currentFeature = null;
    currentFeatureLines = [];
  }

  for (const rawLine of allTextLines) {
    const hm = rawLine.trim().match(HEAD_RE);
    if (hm) {
      const depth = hm[1].length;
      const headingName = inline(hm[2]).replace(/\.$/, '').trim();

      // Check if this heading matches a feature name from the level table
      let matchedLevel = null;
      let matchedFeatureName = headingName;
      const hn = headingName.toLowerCase();
      // Prefer exact matches first
      for (const [fname, lvl] of Object.entries(featureLevels)) {
        if (fname.toLowerCase() === hn) {
          matchedLevel = lvl;
          matchedFeatureName = fname;
          break;
        }
      }
      // Then prefix/contains matches
      if (matchedLevel === null) {
        for (const [fname, lvl] of Object.entries(featureLevels)) {
          const fn = fname.toLowerCase();
          if (hn.includes(fn) || fn.includes(hn)) {
            matchedLevel = lvl;
            matchedFeatureName = fname;
            break;
          }
        }
      }

      if (matchedLevel !== null) {
        flushFeature();
        currentFeature = { name: matchedFeatureName, level: matchedLevel, entries: [] };
      } else if (depth <= 3 && !headingName.toLowerCase().includes('class features') && !headingName.toLowerCase().includes('hit points') && !headingName.toLowerCase().includes('proficiencies') && !headingName.toLowerCase().includes('equipment') && !headingName.toLowerCase().includes('multiclassing')) {
        // Possibly a feature not in the table - include as level 3
        flushFeature();
        currentFeature = { name: headingName, level: 3, entries: [] };
      }

      if (depth > 3 || !matchedLevel) {
        currentFeatureLines.push(rawLine.trim());
      }
      continue;
    }

    if (currentFeature) {
      currentFeatureLines.push(rawLine.trim());
    }
  }

  flushFeature();

  // Dedupe features by name (keep first occurrence)
  result.features = result.features.filter(
    (f, i, arr) => arr.findIndex(x => x.name.toLowerCase() === f.name.toLowerCase()) === i
  );

  return result;
}

/* ── Subclass parser ───────────────────────────────────────────── */

export function parseSubclass(txt, name, className, classSource) {
  const result = {
    name,
    shortName: name.replace(/^(Order of the |Path of the |College of the |Domain of |Circle of the |Way of the |Oath of the |Martial Archetype: )/i, ''),
    source: 'SRD',
    className,
    classSource: classSource || 'PHB',
    edition: 'classic',
    features: [],
  };

  const lines = txt.split(/\r?\n/);
  const HEAD_RE = /^(\+{1,6})\s+(.*)$/;
  const fullText = lines.map(l => l.trim()).join('\n');

  // Extract source
  const sourceM = fullText.match(/Source:\s*(.+)/);
  if (sourceM) result.source = normalizeSource(sourceM[1].trim());

  let currentFeature = null;
  let currentFeatureLines = [];

  function flushFeature() {
    if (currentFeature) {
      currentFeature.entries = blocksToEntries(currentFeatureLines.join('\n'));
      result.features.push(currentFeature);
    }
    currentFeature = null;
    currentFeatureLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('title:') || line.startsWith('[!--') || line.startsWith('[[module') || line.startsWith('[[include') || line === '[[/module]]' || line === '[[/include]]') continue;
    if (/^\[\[[^\]]*\]\]$/.test(line) || /^\[\[\/[^\]]*\]\]$/.test(line)) continue;
    if (/^-{4,}$/.test(line) || /^={4,}$/.test(line)) continue;

    const hm = line.match(HEAD_RE);
    if (hm) {
      const headingName = inline(hm[2]).replace(/\.$/, '').trim();

      flushFeature();

      // Try to extract level from subsequent text or from this heading's context
      let level = null;

      // Look for level in feature content (will be in next lines)
      // For now, set default; we'll fix after full parse
      currentFeature = { name: headingName, level: 3, entries: [], _levelText: null };
      continue;
    }

    if (currentFeature) {
      currentFeatureLines.push(line);

      // Try to extract level from this line
      if (currentFeature._levelText === null) {
        const lvlM = line.match(/(?:at|starting at|upon reaching|beginning at)\s+(\d+)(?:st|nd|rd|th)\s+level/i);
        if (lvlM) {
          currentFeature._levelText = parseInt(lvlM[1], 10);
        }
      }
    }
  }

  flushFeature();

  // Fix levels from _levelText
  for (const f of result.features) {
    if (f._levelText != null) f.level = f._levelText;
    delete f._levelText;
  }

  return result;
}

/* ── File I/O helpers ──────────────────────────────────────────── */

export function readFilesRecursive(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...readFilesRecursive(fullPath));
    } else if (extname(entry) === '.txt') {
      results.push(fullPath);
    }
  }
  return results;
}

export function readTxt(path) {
  return readFileSync(path, 'utf8');
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
}

export { ABILITY_MAP, SOURCE_MAP, OFFICIAL_SHORT };
