import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    // Execute the raw SQL query
    const result = await db.execute(sql.raw(query));

    return NextResponse.json({
      success: true,
      rows: result,
      rowCount: Array.isArray(result) ? result.length : 0,
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
  }
}
