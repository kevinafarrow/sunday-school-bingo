import { describe, it, expect, beforeEach } from 'vitest';
import { loadGame, saveGame, clearGame, isValidGame, STORAGE_PREFIX } from '../src/storage.js';
import { buildCard, freshMarks, FREE_INDEX, CELL_COUNT } from '../src/card.js';
import { parsePool } from '../src/pool.js';
import { readFileSync } from 'node:fs';

const pool = parsePool(readFileSync(new URL('../squares.txt', import.meta.url), 'utf8'));

/** A minimal in-memory stand-in for localStorage. */
function makeStorage(overrides = {}) {
  const map = new Map();

  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
    ...overrides,
  };
}

let storage;
let cells;
let marks;

beforeEach(() => {
  storage = makeStorage();
  cells = buildCard(pool, 'seed1');
  marks = freshMarks();
});

describe('saveGame / loadGame', () => {
  it('round-trips a game', () => {
    marks[3] = true;
    saveGame(storage, 'seed1', cells, marks);

    expect(loadGame(storage, 'seed1')).toEqual({ cells, marks });
  });

  it('keys games by seed', () => {
    saveGame(storage, 'seed1', cells, marks);
    expect(loadGame(storage, 'seed2')).toBeNull();
  });

  it('stores under the documented key prefix', () => {
    saveGame(storage, 'seed1', cells, marks);
    expect([...storage._map.keys()]).toEqual([`${STORAGE_PREFIX}seed1`]);
  });

  it('returns null when nothing is saved', () => {
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('survives a pool that changed after the card was saved', () => {
    saveGame(storage, 'seed1', cells, marks);

    // squares.txt gained entries; the restored card must be untouched by that.
    const grown = [...pool, 'A brand new square', 'And another'];
    expect(loadGame(storage, 'seed1').cells).toEqual(cells);
    expect(loadGame(storage, 'seed1').cells).not.toEqual(buildCard(grown, 'seed1'));
  });

  it('reports failure instead of throwing when storage rejects the write', () => {
    const full = makeStorage({
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });

    expect(saveGame(full, 'seed1', cells, marks)).toBe(false);
  });

  it('treats a throwing getItem as no saved game', () => {
    const blocked = makeStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
    });

    expect(loadGame(blocked, 'seed1')).toBeNull();
  });
});

describe('loadGame with damaged entries', () => {
  const write = (value) => storage.setItem(`${STORAGE_PREFIX}seed1`, value);

  it('ignores unparseable JSON', () => {
    write('{not json');
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('ignores an entry from a different version', () => {
    write(JSON.stringify({ version: 99, cells, marks }));
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('ignores a card of the wrong length', () => {
    write(JSON.stringify({ version: 1, cells: cells.slice(0, 20), marks }));
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('ignores marks of the wrong length', () => {
    write(JSON.stringify({ version: 1, cells, marks: marks.slice(0, 20) }));
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('ignores an entry whose free space has been tampered with', () => {
    const moved = cells.slice();
    moved[FREE_INDEX] = 'Not the free space';
    write(JSON.stringify({ version: 1, cells: moved, marks }));
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('ignores an entry where the free space is unmarked', () => {
    const unmarked = marks.slice();
    unmarked[FREE_INDEX] = false;
    write(JSON.stringify({ version: 1, cells, marks: unmarked }));
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('ignores non-boolean marks', () => {
    write(JSON.stringify({ version: 1, cells, marks: new Array(CELL_COUNT).fill(1) }));
    expect(loadGame(storage, 'seed1')).toBeNull();
  });
});

describe('isValidGame', () => {
  it('accepts a well-formed game', () => {
    expect(isValidGame({ version: 1, cells, marks })).toBe(true);
  });

  it('rejects nullish and non-object values', () => {
    for (const value of [null, undefined, 42, 'nope', []]) {
      expect(isValidGame(value)).toBe(false);
    }
  });
});

describe('clearGame', () => {
  it('removes a saved game', () => {
    saveGame(storage, 'seed1', cells, marks);
    clearGame(storage, 'seed1');
    expect(loadGame(storage, 'seed1')).toBeNull();
  });

  it('does not throw when storage refuses', () => {
    const blocked = makeStorage({
      removeItem: () => {
        throw new Error('SecurityError');
      },
    });

    expect(() => clearGame(blocked, 'seed1')).not.toThrow();
  });
});
