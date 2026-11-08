import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const textMessageKey = id => createHash('sha256').update(id).digest('hex').slice(0, 32);
export class SmsStore {
  constructor(filename) {
    if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS nest_sms_payments (
        owner TEXT NOT NULL, id TEXT NOT NULL, status TEXT NOT NULL,
        phone TEXT NOT NULL, recipient TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0),
        day TEXT NOT NULL, created INTEGER NOT NULL, lease_until INTEGER NOT NULL,
        prepared TEXT, PRIMARY KEY(owner,id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS nest_sms_one_active ON nest_sms_payments(owner) WHERE status IN ('preparing','pending');
      CREATE INDEX IF NOT EXISTS nest_sms_daily_usage ON nest_sms_payments(owner,day,status);
      CREATE TABLE IF NOT EXISTS nest_sms_legacy (owner TEXT NOT NULL, day TEXT NOT NULL, amount INTEGER NOT NULL, PRIMARY KEY(owner,day));`);
  }
  decode(row) {
    return row ? { ...row, amount: BigInt(row.amount), ...(row.prepared ? JSON.parse(row.prepared) : {}) } : null;
  }
  get(owner, id) { return this.decode(this.db.prepare('SELECT * FROM nest_sms_payments WHERE owner=? AND id=?').get(owner, id)); }
  active(owner, now = Date.now()) {
    // A timed-out preparation cannot later save/broadcast: savePrepared checks the same lease.
    this.db.prepare("UPDATE nest_sms_payments SET status='expired' WHERE owner=? AND status='preparing' AND lease_until<?").run(owner, now);
    return this.decode(this.db.prepare("SELECT * FROM nest_sms_payments WHERE owner=? AND status IN ('preparing','pending') LIMIT 1").get(owner));
  }
  spent(owner, day, legacy = 0) {
    if (!Number.isSafeInteger(legacy) || legacy < 0) throw new Error('Invalid saved text-payment usage');
    this.db.prepare('INSERT OR IGNORE INTO nest_sms_legacy(owner,day,amount) VALUES(?,?,?)').run(owner, day, legacy);
    const { amount } = this.db.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM nest_sms_payments WHERE owner=? AND day=? AND status IN ('preparing','pending','confirmed')").get(owner, day);
    const previous = this.db.prepare('SELECT amount FROM nest_sms_legacy WHERE owner=? AND day=?').get(owner, day);
    return BigInt(amount) + BigInt(previous.amount);
  }
  reserve(owner, payment, limit, legacy = 0, now = Date.now()) {
    const amount = Number(payment.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || !payment.id || !payment.phone || !payment.recipient) throw new Error('Invalid text payment');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.get(owner, payment.id) || this.active(owner, now);
      if (existing) { this.db.exec('COMMIT'); return { created: false, payment: existing }; }
      if (this.spent(owner, payment.day, legacy) + payment.amount > limit) throw new Error('TEXT_DAILY_LIMIT');
      this.db.prepare("INSERT INTO nest_sms_payments(owner,id,status,phone,recipient,amount,day,created,lease_until) VALUES(?,?,'preparing',?,?,?,?,?,?)").run(owner, payment.id, payment.phone, payment.recipient, amount, payment.day, now, now + 120_000);
      const saved = this.get(owner, payment.id);
      this.db.exec('COMMIT'); return { created: true, payment: saved };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  savePrepared(owner, id, prepared, now = Date.now()) {
    if (typeof prepared.transaction !== 'string' || !prepared.transaction || prepared.transaction.length > 5000 || typeof prepared.signature !== 'string' || !prepared.signature || !Number.isSafeInteger(prepared.lastValidBlockHeight) || prepared.lastValidBlockHeight < 1) throw new Error('Invalid text checkpoint');
    const result = this.db.prepare("UPDATE nest_sms_payments SET status='pending',prepared=? WHERE owner=? AND id=? AND status='preparing' AND lease_until>=?").run(JSON.stringify(prepared), owner, id, now);
    if (result.changes !== 1) throw new Error('This text payment expired before broadcast. Send a new request.');
    return this.get(owner, id);
  }
  finish(owner, id, status) {
    if (!['confirmed', 'failed', 'expired'].includes(status)) throw new Error('Invalid text payment status');
    this.db.prepare("UPDATE nest_sms_payments SET status=? WHERE owner=? AND id=? AND status IN ('preparing','pending')").run(status, owner, id);
  }
  close() { this.db.close(); }
}
let store;
export function smsStore(create = true) {
  if (store) return store;
  const filename = path.resolve(process.env.SMS_STORE_PATH || '.data/nest-sms.sqlite');
  if (!create) {
    try { statSync(filename); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  if (process.env.VERCEL) throw new Error('SMS payments need persistent storage. Use the laptop demo or a server with a persistent disk.');
  return store = new SmsStore(filename);
}
export const activeTextPayment = owner => smsStore(false)?.active(owner) ?? null;
