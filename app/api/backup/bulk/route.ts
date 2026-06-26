import JSZip from 'jszip';
import { tableExports, toCsv } from '@/lib/api/backup';

export async function GET() {
  const zip = new JSZip();

  for (const exporter of tableExports) {
    zip.file(`${exporter.key}.csv`, toCsv(await exporter.rows()));
  }

  const buffer = await zip.generateAsync({ type: 'arraybuffer' }) as ArrayBuffer;
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup_${date}.zip"`,
    },
  });
}
