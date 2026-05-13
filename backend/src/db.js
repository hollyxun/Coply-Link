import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'links.db'));

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
export const DAILY_LIMIT = 3;

// Repository对象，初始化后填充
let statements = null;

// Links Repository
export const linksRepo = {
  findAll: () => statements.links.findAll.all(),
  findById: (id) => statements.links.findById.get(id),
  findByOwner: (fingerprint, ip) => statements.links.findByOwner.all(fingerprint, ip),
  create: (title, url, description, fingerprint, ip) => {
    const result = statements.links.insert.run(title, url, description, fingerprint, ip);
    return { id: result.lastInsertRowid, title, url, description, fingerprint, ip, clicks: 0 };
  },
  update: (id, title, url, description) => {
    statements.links.update.run(title, url, description, id);
    return { success: true };
  },
  updateByOwner: (id, title, url, description, fingerprint, ip) => {
    const result = statements.links.updateByOwner.run(title, url, description, id, fingerprint, ip);
    return { success: result.changes > 0, changes: result.changes };
  },
  deleteByOwner: (id, fingerprint, ip) => {
    const result = statements.links.deleteByOwner.run(id, fingerprint, ip);
    return { success: result.changes > 0, changes: result.changes };
  },
  delete: (id) => {
    statements.links.delete.run(id);
    return { success: true };
  },
  deleteAll: () => statements.links.deleteAll.run(),
  click: (id) => {
    statements.links.incrementClicks.run(id);
    return statements.links.getClicks.get(id);
  },
  findByUserId: (userId) => statements.links.findByUserId.get(userId),
  upsertByUser: (userId, title, url, description = '') => {
    const existing = statements.links.findByUserId.get(userId);
    if (existing) {
      statements.links.updateByUser.run(title, url, description, userId);
      return { id: existing.id, title, url, description, clicks: existing.clicks, user_id: userId };
    } else {
      const result = statements.links.insertWithUser.run(title, url, description, userId);
      return { id: result.lastInsertRowid, title, url, description, clicks: 0, user_id: userId };
    }
  }
};

// Users Repository
export const usersRepo = {
  findByUsername: (username) => statements.users.findByUsername.get(username),
  create: (username, password) => {
    const result = statements.users.insert.run(username, password);
    return { id: result.lastInsertRowid, username };
  }
};

// Submission Repository (fingerprint + IP 组合计数)
export const submissionRepo = {
  getCount: (fingerprint, ip, date) => {
    const record = statements.submission.getCount.get(fingerprint, ip, date);
    return record?.count || 0;
  },
  incrementOrCreate: (fingerprint, ip, date) => {
    const record = statements.submission.getCount.get(fingerprint, ip, date);
    if (record) {
      statements.submission.incrementCount.run(fingerprint, ip, date);
    } else {
      statements.submission.insert.run(fingerprint, ip, date);
    }
  },
  deleteAll: () => statements.submission.deleteAll.run(),
};

export function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      clicks INTEGER DEFAULT 0,
      fingerprint TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submission_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      ip TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(fingerprint, ip, date)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 确保 links 表包含 user_id 字段（适配旧数据库）
  try {
    db.exec('ALTER TABLE links ADD COLUMN user_id INTEGER');
  } catch (e) {
    // 如果字段已存在，忽略错误
  }


  // 表创建后再编译语句
  statements = {
    links: {
      findAll: db.prepare('SELECT * FROM links ORDER BY RANDOM()'),
      findById: db.prepare('SELECT * FROM links WHERE id = ?'),
      findByOwner: db.prepare('SELECT * FROM links WHERE fingerprint = ? AND ip = ?'),
      insert: db.prepare('INSERT INTO links (title, url, description, fingerprint, ip) VALUES (?, ?, ?, ?, ?)'),
      update: db.prepare('UPDATE links SET title = ?, url = ?, description = ? WHERE id = ?'),
      updateByOwner: db.prepare('UPDATE links SET title = ?, url = ?, description = ? WHERE id = ? AND fingerprint = ? AND ip = ?'),
      deleteByOwner: db.prepare('DELETE FROM links WHERE id = ? AND fingerprint = ? AND ip = ?'),
      delete: db.prepare('DELETE FROM links WHERE id = ?'),
      deleteAll: db.prepare('DELETE FROM links'),
      incrementClicks: db.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?'),
      getClicks: db.prepare('SELECT clicks FROM links WHERE id = ?'),
      findByUserId: db.prepare('SELECT * FROM links WHERE user_id = ?'),
      updateByUser: db.prepare('UPDATE links SET title = ?, url = ?, description = ? WHERE user_id = ?'),
      insertWithUser: db.prepare('INSERT INTO links (title, url, description, user_id) VALUES (?, ?, ?, ?)'),
    },
    submission: {
      getCount: db.prepare('SELECT count FROM submission_limits WHERE fingerprint = ? AND ip = ? AND date = ?'),
      incrementCount: db.prepare('UPDATE submission_limits SET count = count + 1 WHERE fingerprint = ? AND ip = ? AND date = ?'),
      insert: db.prepare('INSERT INTO submission_limits (fingerprint, ip, date, count) VALUES (?, ?, ?, 1)'),
      deleteAll: db.prepare('DELETE FROM submission_limits'),
    },
    users: {
      findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
      insert: db.prepare('INSERT INTO users (username, password) VALUES (?, ?)'),
    },
  };
}