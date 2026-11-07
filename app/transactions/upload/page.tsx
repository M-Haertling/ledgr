export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import UploadForm from './UploadForm';
import UploadHistory from './UploadHistory';
import { listUploads } from '@/lib/api/uploads';

export default async function UploadPage() {
  const allAccounts = await db.query.accounts.findMany();
  const allTemplates = await db.query.mappings.findMany();
  const uploads = (await listUploads()).map(u => ({ ...u, uploadedAt: u.uploadedAt.toISOString() }));

  return (
    <div>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="mb-4">Upload Transactions</h1>
        <UploadForm accounts={allAccounts} templates={allTemplates} />
      </div>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="mb-4">Upload History</h2>
        <UploadHistory uploads={uploads} />
      </section>
    </div>
  );
}
