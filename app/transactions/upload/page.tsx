export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { accounts, mappings } from '@/lib/db/schema';
import UploadForm from './UploadForm';

export default async function UploadPage() {
  const allAccounts = await db.query.accounts.findMany();
  const allTemplates = await db.query.mappings.findMany();

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="mb-4">Upload Transactions</h1>
      <UploadForm accounts={allAccounts} templates={allTemplates} />
    </div>
  );
}
