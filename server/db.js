/**
 * EventBox UZ — database layer
 * Built on Node's built-in `node:sqlite` (SQLite 3.51) — zero native compilation.
 * Provides a small, safe query API used by every route module.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'eventbox.db');

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');

/** Convert JS values into SQLite-friendly bindings. */
function bind(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

/** Rows arrive with a null prototype and 0/1 integers — normalise them. */
function normalize(row) {
  if (row === null || row === undefined) return row;
  const out = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    out[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return out;
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params.map(bind)).map(normalize);
}

export function get(sql, params = []) {
  return normalize(db.prepare(sql).get(...params.map(bind)) || null);
}

export function run(sql, params = []) {
  const info = db.prepare(sql).run(...params.map(bind));
  return { changes: Number(info.changes), lastInsertRowid: Number(info.lastInsertRowid) };
}

/** Insert from an object literal. Returns the new row id. */
export function insert(table, data) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  return run(sql, keys.map((k) => data[k])).lastInsertRowid;
}

/** Update from an object literal. Returns the number of changed rows. */
export function update(table, id, data) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  if (!keys.length) return 0;
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
  return run(sql, [...keys.map((k) => data[k]), id]).changes;
}

/** Cast selected integer columns of a row to real booleans. */
export function bools(row, fields) {
  if (!row) return row;
  for (const f of fields) row[f] = !!row[f];
  return row;
}

export function boolsAll(rows, fields) {
  return rows.map((r) => bools(r, fields));
}

/** Run a set of statements atomically. */
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* already rolled back */
    }
    throw error;
  }
}

export function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function today(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
