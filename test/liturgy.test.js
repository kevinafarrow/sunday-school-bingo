import { describe, it, expect } from 'vitest';
import { easter, adventStart, baptismOfTheLord, seasonFor, SEASONS } from '../src/liturgy.js';

/** A local-time date, the way the app sees "today". */
const on = (iso) => new Date(`${iso}T12:00:00`);

/** UTC timestamp -> ISO day, for comparing against published dates. */
const day = (stamp) => new Date(stamp).toISOString().slice(0, 10);

describe('easter', () => {
  // Published Western (Gregorian) dates.
  const known = {
    2000: '2000-04-23',
    2008: '2008-03-23',
    2011: '2011-04-24',
    2023: '2023-04-09',
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21',
    2038: '2038-04-25',
  };

  for (const [year, date] of Object.entries(known)) {
    it(`falls on ${date}`, () => {
      expect(day(easter(Number(year)))).toBe(date);
    });
  }

  it('always lands on a Sunday', () => {
    for (let year = 1900; year <= 2100; year++) {
      expect(new Date(easter(year)).getUTCDay()).toBe(0);
    }
  });

  it('always falls between 22 March and 25 April', () => {
    for (let year = 1900; year <= 2100; year++) {
      const date = day(easter(year)).slice(5);
      expect(date >= '03-22' && date <= '04-25').toBe(true);
    }
  });
});

describe('adventStart', () => {
  const known = {
    2023: '2023-12-03',
    2024: '2024-12-01',
    2025: '2025-11-30',
    2026: '2026-11-29',
    2027: '2027-11-28',
  };

  for (const [year, date] of Object.entries(known)) {
    it(`begins on ${date}`, () => {
      expect(day(adventStart(Number(year)))).toBe(date);
    });
  }

  it('is always a Sunday between 27 November and 3 December', () => {
    for (let year = 1900; year <= 2100; year++) {
      const stamp = adventStart(year);
      expect(new Date(stamp).getUTCDay()).toBe(0);

      const date = day(stamp).slice(5);
      expect(date >= '11-27' && date <= '12-03').toBe(true);
    }
  });

  it('leaves exactly four Sundays before Christmas', () => {
    for (let year = 1900; year <= 2100; year++) {
      const gap = (Date.UTC(year, 11, 25) - adventStart(year)) / 86400000;
      expect(gap).toBeGreaterThanOrEqual(22);
      expect(gap).toBeLessThanOrEqual(28);
    }
  });
});

describe('baptismOfTheLord', () => {
  it('is the Sunday after Epiphany', () => {
    expect(day(baptismOfTheLord(2025))).toBe('2025-01-12');
    expect(day(baptismOfTheLord(2026))).toBe('2026-01-11');
    expect(day(baptismOfTheLord(2027))).toBe('2027-01-10');
  });

  it('moves to the Monday when Epiphany itself falls as late as 7 January', () => {
    // Epiphany 2024 was Sunday 7 January, so the Baptism was Monday the 8th.
    expect(day(baptismOfTheLord(2024))).toBe('2024-01-08');
    expect(new Date(baptismOfTheLord(2024)).getUTCDay()).toBe(1);
  });

  it('always falls in the first half of January', () => {
    for (let year = 1900; year <= 2100; year++) {
      const date = day(baptismOfTheLord(year));
      expect(date >= `${year}-01-07` && date <= `${year}-01-13`).toBe(true);
    }
  });
});

describe('seasonFor', () => {
  it('reads Ordinary Time as the default', () => {
    expect(seasonFor(on('2026-10-06'))).toBe(SEASONS.ORDINARY);
    expect(seasonFor(on('2026-07-15'))).toBe(SEASONS.ORDINARY);
  });

  it('reads Advent, and Gaudete within it', () => {
    expect(seasonFor(on('2026-11-29'))).toBe(SEASONS.ADVENT);
    expect(seasonFor(on('2026-12-12'))).toBe(SEASONS.ADVENT);
    expect(seasonFor(on('2026-12-13'))).toBe(SEASONS.GAUDETE);
    expect(seasonFor(on('2026-12-14'))).toBe(SEASONS.ADVENT);
    expect(seasonFor(on('2026-12-24'))).toBe(SEASONS.ADVENT);
  });

  it('reads Christmas across the new year', () => {
    expect(seasonFor(on('2026-12-25'))).toBe(SEASONS.CHRISTMAS);
    expect(seasonFor(on('2026-12-31'))).toBe(SEASONS.CHRISTMAS);
    expect(seasonFor(on('2027-01-01'))).toBe(SEASONS.CHRISTMAS);
    expect(seasonFor(on('2027-01-10'))).toBe(SEASONS.CHRISTMAS);
    expect(seasonFor(on('2027-01-11'))).toBe(SEASONS.ORDINARY);
  });

  it('reads Lent, and Laetare within it', () => {
    expect(seasonFor(on('2026-02-17'))).toBe(SEASONS.ORDINARY); // Shrove Tuesday
    expect(seasonFor(on('2026-02-18'))).toBe(SEASONS.LENT); // Ash Wednesday
    expect(seasonFor(on('2026-03-14'))).toBe(SEASONS.LENT);
    expect(seasonFor(on('2026-03-15'))).toBe(SEASONS.LAETARE);
    expect(seasonFor(on('2026-03-16'))).toBe(SEASONS.LENT);
  });

  it('reads Holy Week, where single days outrank the season', () => {
    expect(seasonFor(on('2026-03-29'))).toBe(SEASONS.PALM_SUNDAY);
    expect(seasonFor(on('2026-03-30'))).toBe(SEASONS.LENT);
    expect(seasonFor(on('2026-04-03'))).toBe(SEASONS.GOOD_FRIDAY);
    expect(seasonFor(on('2026-04-04'))).toBe(SEASONS.LENT); // Holy Saturday
  });

  it('reads Easter through to Pentecost', () => {
    expect(seasonFor(on('2026-04-05'))).toBe(SEASONS.EASTER);
    expect(seasonFor(on('2026-05-14'))).toBe(SEASONS.EASTER); // Ascension
    expect(seasonFor(on('2026-05-23'))).toBe(SEASONS.EASTER);
    expect(seasonFor(on('2026-05-24'))).toBe(SEASONS.PENTECOST);
    expect(seasonFor(on('2026-05-25'))).toBe(SEASONS.ORDINARY);
  });

  it('holds up in a year when Easter is early', () => {
    // Easter 2024 was 31 March; Ash Wednesday 14 February.
    expect(seasonFor(on('2024-02-13'))).toBe(SEASONS.ORDINARY);
    expect(seasonFor(on('2024-02-14'))).toBe(SEASONS.LENT);
    expect(seasonFor(on('2024-03-10'))).toBe(SEASONS.LAETARE);
    expect(seasonFor(on('2024-03-31'))).toBe(SEASONS.EASTER);
    expect(seasonFor(on('2024-05-19'))).toBe(SEASONS.PENTECOST);
  });

  it('never returns a season outside the known set', () => {
    const known = new Set(Object.values(SEASONS));
    const date = new Date(Date.UTC(2026, 0, 1, 12));

    for (let i = 0; i < 365 * 6; i++) {
      expect(known.has(seasonFor(date))).toBe(true);
      date.setUTCDate(date.getUTCDate() + 1);
    }
  });

  it('covers every season across a few years', () => {
    const seen = new Set();
    const date = new Date(Date.UTC(2024, 0, 1, 12));

    for (let i = 0; i < 365 * 4; i++) {
      seen.add(seasonFor(date));
      date.setUTCDate(date.getUTCDate() + 1);
    }

    expect(seen).toEqual(new Set(Object.values(SEASONS)));
  });

  it('defaults to today without throwing', () => {
    expect(Object.values(SEASONS)).toContain(seasonFor());
  });
});
