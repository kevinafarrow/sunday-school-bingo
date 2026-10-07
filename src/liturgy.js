/**
 * The liturgical season, as a pure function of the date.
 *
 * This is what colours the card: green through Ordinary Time, violet in Advent
 * and Lent, rose on the two Sundays that call for it, white-and-gold at
 * Christmas and Easter, red at Pentecost. Everything here derives from Easter
 * and Christmas, so there is no table of dates to maintain and nothing to
 * update each year.
 *
 * Roman Catholic calendar (the general calendar as used in the US, where
 * Epiphany is kept on a Sunday). The seasons modelled are only those that
 * change the colour; the sanctoral cycle is deliberately out of scope.
 */

/** @typedef {'advent'|'gaudete'|'christmas'|'lent'|'laetare'|'palm-sunday'|'good-friday'|'easter'|'pentecost'|'ordinary'} Season */

/** @type {Record<string, Season>} */
export const SEASONS = {
  ADVENT: 'advent',
  GAUDETE: 'gaudete',
  CHRISTMAS: 'christmas',
  LENT: 'lent',
  LAETARE: 'laetare',
  PALM_SUNDAY: 'palm-sunday',
  GOOD_FRIDAY: 'good-friday',
  EASTER: 'easter',
  PENTECOST: 'pentecost',
  ORDINARY: 'ordinary',
};

const DAY_MS = 86400000;

/**
 * Days are handled as UTC midnight timestamps so that arithmetic can't be
 * knocked sideways by daylight saving.
 */
function addDays(stamp, days) {
  return stamp + days * DAY_MS;
}

function dayOf(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function weekday(stamp) {
  return new Date(stamp).getUTCDay();
}

/**
 * Easter Sunday, by the Gregorian computus (Meeus/Jones/Butcher).
 *
 * @param {number} year
 * @returns {number} UTC midnight timestamp
 */
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return Date.UTC(year, month - 1, day);
}

/**
 * The First Sunday of Advent: the fourth Sunday before Christmas, which always
 * lands between 27 November and 3 December.
 *
 * @param {number} year
 * @returns {number} UTC midnight timestamp
 */
export function adventStart(year) {
  const christmas = Date.UTC(year, 11, 25);
  const dow = weekday(christmas);

  // The last Sunday strictly before Christmas is Advent IV; back up three more
  // weeks for Advent I. When Christmas itself falls on a Sunday it belongs to
  // Christmas, not Advent, hence the full seven days.
  const adventFour = addDays(christmas, -(dow === 0 ? 7 : dow));
  return addDays(adventFour, -21);
}

/**
 * The Baptism of the Lord, which closes the Christmas season.
 *
 * Epiphany is kept on the Sunday falling between 2 and 8 January; the Baptism
 * is the Sunday after — except when Epiphany falls that late, when it is the
 * following Monday instead.
 *
 * @param {number} year
 * @returns {number} UTC midnight timestamp
 */
export function baptismOfTheLord(year) {
  let epiphany = Date.UTC(year, 0, 2);
  while (weekday(epiphany) !== 0) epiphany = addDays(epiphany, 1);

  const date = new Date(epiphany).getUTCDate();
  return date >= 7 ? addDays(epiphany, 1) : addDays(epiphany, 7);
}

/**
 * The season governing a given day.
 *
 * Single days that outrank their season — Gaudete, Laetare, Palm Sunday, Good
 * Friday, Pentecost — are tested first, so they win over the Advent, Lent or
 * Easter block they sit inside.
 *
 * @param {Date} [date] defaults to now, read in the viewer's own timezone
 * @returns {Season}
 */
export function seasonFor(date = new Date()) {
  const today = dayOf(date);
  const year = new Date(today).getUTCFullYear();

  const easterDay = easter(year);
  const goodFriday = addDays(easterDay, -2);
  const palmSunday = addDays(easterDay, -7);
  const laetare = addDays(easterDay, -21);
  const ashWednesday = addDays(easterDay, -46);
  const holySaturday = addDays(easterDay, -1);
  const pentecost = addDays(easterDay, 49);

  const advent = adventStart(year);
  const gaudete = addDays(advent, 14);
  const baptism = baptismOfTheLord(year);
  const christmas = Date.UTC(year, 11, 25);

  if (today === goodFriday) return SEASONS.GOOD_FRIDAY;
  if (today === palmSunday) return SEASONS.PALM_SUNDAY;
  if (today === pentecost) return SEASONS.PENTECOST;
  if (today === laetare) return SEASONS.LAETARE;
  if (today === gaudete) return SEASONS.GAUDETE;

  // Christmas is tested before Advent: 25 December onwards satisfies both.
  if (today >= christmas) return SEASONS.CHRISTMAS;
  if (today <= baptism) return SEASONS.CHRISTMAS;
  if (today >= advent) return SEASONS.ADVENT;
  if (today >= ashWednesday && today <= holySaturday) return SEASONS.LENT;
  if (today >= easterDay && today <= pentecost) return SEASONS.EASTER;

  return SEASONS.ORDINARY;
}
