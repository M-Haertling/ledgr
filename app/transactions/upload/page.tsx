export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import UploadForm from './UploadForm';
import UploadHistory from './UploadHistory';
import { countUploads, listUploads } from '@/lib/api/uploads';

const PAGE_SIZE = 20;

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requestedPage = Math.max(0, parseInt(params.page as string) || 0);

  const allAccounts = await db.query.accounts.findMany();
  const allTemplates = await db.query.mappings.findMany();

  const total = await countUploads();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp so deleting the last row on the final page doesn't strand you on an empty page.
  const page = Math.min(requestedPage, totalPages - 1);
  const uploads = (await listUploads({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }))
    .map(u => ({ ...u, uploadedAt: u.uploadedAt.toISOString() }));

  const pageHref = (p: number) => (p > 0 ? `/transactions/upload?page=${p}` : '/transactions/upload');

  return (
    <div>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="mb-4">Upload Transactions</h1>
        <UploadForm accounts={allAccounts} templates={allTemplates} />
      </div>

      <section id="history" style={{ marginTop: '2.5rem' }}>
        <h2 className="mb-4">
          Upload History{' '}
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>
            ({total.toLocaleString()})
          </span>
        </h2>
        <UploadHistory uploads={uploads} />

        {totalPages > 1 && (
          <div className="pagination">
            {page > 0 ? (
              <Link className="btn btn-secondary btn-sm" href={`${pageHref(page - 1)}#history`}>← Previous</Link>
            ) : (
              <button className="btn btn-secondary btn-sm" disabled>← Previous</button>
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              Page {page + 1} of {totalPages}
            </span>
            {page < totalPages - 1 ? (
              <Link className="btn btn-secondary btn-sm" href={`${pageHref(page + 1)}#history`}>Next →</Link>
            ) : (
              <button className="btn btn-secondary btn-sm" disabled>Next →</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
