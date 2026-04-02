import { Database } from 'bun:sqlite';
import path from 'path';

const appData = process.env.APPDATA;

if (!appData) {
  throw new Error('APPDATA is not defined');
}

const dbPath = path.join(appData, 'connectmessenger', 'db.sqlite');
const db = new Database(dbPath);

const getColumns = () =>
  db
    .query('PRAGMA table_info(channels)')
    .all()
    .map((row) => row.name);

const columns = getColumns();
const statements = [];

if (!columns.includes('is_group_channel')) {
  statements.push(
    'ALTER TABLE channels ADD COLUMN is_group_channel integer NOT NULL DEFAULT false'
  );
}

if (!columns.includes('group_description')) {
  statements.push('ALTER TABLE channels ADD COLUMN group_description text');
}

if (!columns.includes('group_filter')) {
  statements.push("ALTER TABLE channels ADD COLUMN group_filter text NOT NULL DEFAULT 'Все'");
}

if (!columns.includes('group_avatar_id')) {
  statements.push(
    'ALTER TABLE channels ADD COLUMN group_avatar_id integer REFERENCES files(id) ON DELETE set null'
  );
}

for (const statement of statements) {
  db.run(statement);
}

console.log(
  JSON.stringify(
    {
      dbPath,
      applied: statements,
      columns: getColumns()
    },
    null,
    2
  )
);

db.close();
