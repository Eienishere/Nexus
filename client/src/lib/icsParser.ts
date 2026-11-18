// ICS (iCalendar RFC 5545) Parser & Generator for NEXUS
// Handles parsing .ics text, generating .ics output, and view-type validation.

export type NexusViewType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface ParsedEvent {
  summary: string;
  description: string;
  location: string;
  dtstart: Date;
  dtend: Date | null;
  isAllDay: boolean;
  status: string;
}

export interface ParseResult {
  success: true;
  viewType: NexusViewType | null;
  events: ParsedEvent[];
}

export interface ParseError {
  success: false;
  error: string;
}

/**
 * Parse an ICS date string into a JS Date.
 * Supports:
 *   - "YYYYMMDDTHHMMSSZ"  (UTC)
 *   - "YYYYMMDDTHHMMSS"   (local, treated as local)
 *   - "YYYYMMDD"          (all-day / VALUE=DATE)
 */
function parseICSDate(raw: string): { date: Date; isAllDay: boolean } {
  const cleaned = raw.trim();

  // All-day: pure date, 8 digits
  if (/^\d{8}$/.test(cleaned)) {
    const y = parseInt(cleaned.slice(0, 4), 10);
    const m = parseInt(cleaned.slice(4, 6), 10) - 1;
    const d = parseInt(cleaned.slice(6, 8), 10);
    return { date: new Date(y, m, d, 0, 0, 0), isAllDay: true };
  }

  // DateTime with or without Z
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (match) {
    const [, yr, mo, dy, hr, mi, sc, z] = match;
    if (z === 'Z') {
      // UTC → convert to local
      return {
        date: new Date(Date.UTC(+yr, +mo - 1, +dy, +hr, +mi, +sc)),
        isAllDay: false,
      };
    }
    // No Z → treat as local time
    return {
      date: new Date(+yr, +mo - 1, +dy, +hr, +mi, +sc),
      isAllDay: false,
    };
  }

  // Fallback
  return { date: new Date(cleaned), isAllDay: false };
}

/**
 * Unfold ICS lines (RFC 5545 §3.1): lines that start with a space or tab
 * are continuations of the previous line.
 */
function unfoldLines(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && result.length > 0) {
      result[result.length - 1] += line.slice(1);
    } else {
      result.push(line);
    }
  }
  return result;
}

/**
 * Parse ICS text and extract VEVENT blocks.
 */
export function parseICS(icsText: string): ParseResult | ParseError {
  const trimmed = icsText.trim();

  if (!trimmed.includes('BEGIN:VCALENDAR')) {
    return { success: false, error: 'BEGIN:VCALENDAR bulunamadı. Geçerli bir ICS içeriği yapıştırın.' };
  }
  if (!trimmed.includes('BEGIN:VEVENT')) {
    return { success: false, error: 'Hiçbir VEVENT bloğu bulunamadı.' };
  }

  const lines = unfoldLines(trimmed);

  // Extract X-NEXUS-VIEW-TYPE (before first VEVENT)
  let viewType: NexusViewType | null = null;
  for (const line of lines) {
    const vtMatch = line.match(/^X-NEXUS-VIEW-TYPE[;:](.+)$/i);
    if (vtMatch) {
      const val = vtMatch[1].trim().toUpperCase();
      if (val === 'DAILY' || val === 'WEEKLY' || val === 'MONTHLY') {
        viewType = val;
      }
      break;
    }
  }

  // Split into VEVENT blocks
  const events: ParsedEvent[] = [];
  let inEvent = false;
  let currentProps: Record<string, string> = {};

  for (const line of lines) {
    if (line.trim() === 'BEGIN:VEVENT') {
      inEvent = true;
      currentProps = {};
      continue;
    }
    if (line.trim() === 'END:VEVENT') {
      inEvent = false;

      // Extract DTSTART
      const rawStart = currentProps['DTSTART'] || '';
      const rawEnd = currentProps['DTEND'] || '';

      // Check for VALUE=DATE in the key line  
      const isAllDayKey = Object.keys(currentProps).some(
        k => k.startsWith('DTSTART') && k.includes('VALUE=DATE')
      );

      const startParsed = parseICSDate(rawStart);
      const endParsed = rawEnd ? parseICSDate(rawEnd) : null;

      const isAllDay = isAllDayKey || startParsed.isAllDay;

      events.push({
        summary: decodeICSText(currentProps['SUMMARY'] || 'Adsız Etkinlik'),
        description: decodeICSText(currentProps['DESCRIPTION'] || ''),
        location: decodeICSText(currentProps['LOCATION'] || ''),
        dtstart: startParsed.date,
        dtend: endParsed?.date ?? null,
        isAllDay,
        status: currentProps['STATUS'] || 'CONFIRMED',
      });
      continue;
    }

    if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const fullKey = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        // Store with full key (for VALUE=DATE detection) AND base key
        currentProps[fullKey] = value;
        const baseKey = fullKey.split(';')[0];
        if (baseKey !== fullKey) {
          currentProps[baseKey] = value;
        }
      }
    }
  }

  if (events.length === 0) {
    return { success: false, error: 'VEVENT blokları parse edilemedi.' };
  }

  return { success: true, viewType, events };
}

/**
 * Decode ICS text escaping (backslash-n, backslash-comma, etc.)
 */
function decodeICSText(text: string): string {
  return text
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Encode text for ICS (escape special chars)
 */
function encodeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format a Date to ICS UTC format: YYYYMMDDTHHMMSSZ
 */
function toICSDateUTC(date: Date): string {
  const y = date.getUTCFullYear().toString();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  const h = date.getUTCHours().toString().padStart(2, '0');
  const mi = date.getUTCMinutes().toString().padStart(2, '0');
  const s = date.getUTCSeconds().toString().padStart(2, '0');
  return `${y}${m}${d}T${h}${mi}${s}Z`;
}

/**
 * Format a Date to ICS all-day format: YYYYMMDD
 */
function toICSDateOnly(date: Date): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
}

interface ExportEvent {
  title: string;
  date: Date;
  endDate?: Date | null;
  is_all_day?: boolean;
  description?: string;
  location?: string;
}

/**
 * Generate an ICS string from a list of events.
 */
export function generateICS(events: ExportEvent[], viewType: NexusViewType): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEXUS//Verimlilik Takvimi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-NEXUS-VIEW-TYPE:${viewType}`,
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${crypto.randomUUID()}@nexus`);
    lines.push(`DTSTAMP:${toICSDateUTC(new Date())}`);
    lines.push(`SUMMARY:${encodeICSText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${encodeICSText(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${encodeICSText(event.location)}`);
    }

    if (event.is_all_day) {
      lines.push(`DTSTART;VALUE=DATE:${toICSDateOnly(event.date)}`);
      if (event.endDate) {
        lines.push(`DTEND;VALUE=DATE:${toICSDateOnly(event.endDate)}`);
      }
    } else {
      lines.push(`DTSTART:${toICSDateUTC(event.date)}`);
      if (event.endDate) {
        lines.push(`DTEND:${toICSDateUTC(event.endDate)}`);
      }
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Map the current Calendar view to a NexusViewType.
 */
export function viewToNexusType(view: string): NexusViewType {
  switch (view) {
    case 'Day': return 'DAILY';
    case 'Week': return 'WEEKLY';
    case 'Month':
    case 'Agenda':
    default: return 'MONTHLY';
  }
}

/**
 * Human-readable label for a NexusViewType.
 */
export function viewTypeLabel(vt: NexusViewType): string {
  switch (vt) {
    case 'DAILY': return 'Günlük';
    case 'WEEKLY': return 'Haftalık';
    case 'MONTHLY': return 'Aylık';
  }
}

/**
 * Validate that the ICS view type matches the expected view.
 * Returns null if OK, or a warning message string if mismatched.
 */
export function validateViewType(
  icsViewType: NexusViewType | null,
  currentView: string
): string | null {
  if (!icsViewType) return null; // No tag → no validation
  const expected = viewToNexusType(currentView);
  if (icsViewType === expected) return null;
  return `Bu veri ${viewTypeLabel(icsViewType)} formatında, ancak siz ${viewTypeLabel(expected)} görünümündesiniz.`;
}
