import { NextResponse } from 'next/server';
import { tableExports, toCsv } from '@/lib/api/backup';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');

  const exporter = tableExports.find(t => t.key === table);
  if (!exporter) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  const csv = toCsv(await exporter.rows());

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${exporter.key}.csv"`,
    },
  });
}
