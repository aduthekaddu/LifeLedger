import fs from 'fs/promises';
import path from 'path';
import { pool } from './client';
import { logger } from '../config/logger';

async function ensureMigrationTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationTable();
  const applied = await appliedMigrations();
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info('Applied migration', { file });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Migration failed', { file, error });
      throw error;
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      logger.error('Migration runner failed', { error });
      await pool.end();
      process.exit(1);
    });
}
