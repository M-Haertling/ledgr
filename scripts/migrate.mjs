import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// The app container can start before PostgreSQL is ready to accept
// connections (error 57P03: "the database system is starting up").
// Retry with backoff so migrations don't fail on a cold start.
const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 2000;

async function waitForDatabase() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      console.log(
        `Database not ready (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}. Retrying in ${RETRY_DELAY_MS}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

await waitForDatabase();
await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations applied successfully');
await pool.end();
