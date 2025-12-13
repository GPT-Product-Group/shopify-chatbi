#!/bin/sh
set -e

# Ensure the application user can write to the persistent data directory
mkdir -p /app/data
chown -R app:app /app/data

# Ensure standalone dependencies (including better-sqlite3) are discoverable
if [ -d "/app/.next/standalone/node_modules" ]; then
  export NODE_PATH="/app/.next/standalone/node_modules"
  export PATH="/app/.next/standalone/node_modules/.bin:$PATH"
fi

# Create the SQLite tables if they do not exist (avoids Prisma CLI downloads)
su-exec app:app node <<'NODE'
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const defaultUrl = 'file:/app/data/chatbi.db';
const raw = process.env.DATABASE_URL || defaultUrl;

function resolveFilePath(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'file:') return parsed.pathname;
  } catch (err) {
    // Fall back to string parsing below
  }
  return value.replace(/^file:/, '');
}

let dbPath = resolveFilePath(raw);
if (process.platform === 'win32' && dbPath.startsWith('/')) {
  dbPath = dbPath.slice(1);
}

const dir = path.dirname(dbPath);
fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS Shop (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  accessToken TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Conversation (
  id TEXT PRIMARY KEY,
  shopId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shopId) REFERENCES Shop(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  data TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_shopId ON Conversation(shopId);
CREATE INDEX IF NOT EXISTS idx_message_conversationId ON Message(conversationId);
`);
db.close();
NODE

exec su-exec app:app "$@"
