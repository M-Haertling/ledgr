import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    // Execute the raw SQL query
    const result = await client.query(query);

    return NextResponse.json({
      success: true,
      rows: result.rows,
      rowCount: result.rows.length,
    });
  } catch (error: any) {
    console.error('SQL execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Query execution failed',
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
