export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { activities } from '@/lib/db/schema';
import { createActivity } from '@/lib/actions/activities';
import { desc } from 'drizzle-orm';
import ActivitiesTable from './ActivitiesTable';
import PageHeader from '@/app/components/PageHeader';
import NewItemDialog from '@/app/components/NewItemDialog';
import { mergeActivityTransactions } from '@/lib/api/activities';

export default async function ActivitiesPage() {
  const allActivities = await db.query.activities.findMany({
    orderBy: [desc(activities.createdAt)],
    with: {
      updates: {
        with: {
          updateTransactions: {
            with: { transaction: true },
          },
        },
      },
      activityTransactions: {
        with: { transaction: true },
      },
    },
  });

  const activityRows = allActivities.map((activity) => {
    // Total = deduplicated union of update-linked and directly-linked transactions
    const { totalCost } = mergeActivityTransactions(
      activity.updates.flatMap((u) => u.updateTransactions.map((ut) => ut.transaction)),
      activity.activityTransactions.map((at) => at.transaction),
    );

    const startedDates = activity.updates
      .filter(u => u.newStatus === 'Started')
      .map(u => new Date(u.date).getTime());
    const finishedDates = activity.updates
      .filter(u => u.newStatus === 'Finished')
      .map(u => new Date(u.date).getTime());

    return {
      id: activity.id,
      name: activity.name,
      description: activity.description,
      status: activity.status,
      type: activity.type,
      budget: activity.budget ? parseFloat(activity.budget) : null,
      updateCount: activity.updates.length,
      totalCost,
      startDate: startedDates.length > 0 ? new Date(Math.min(...startedDates)).toISOString() : null,
      endDate: finishedDates.length > 0 ? new Date(Math.min(...finishedDates)).toISOString() : null,
    };
  });

  return (
    <div>
      <PageHeader
        title="Activities"
        count={activityRows.length}
        actions={
          <NewItemDialog label="New activity" title="New activity" width={520}>
        <form action={createActivity} className="dialog-form">
          <div>
            <div className="form-group">
              <label htmlFor="name" className="form-label">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="e.g. Summer Vacation 2026"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-input"
                placeholder="Optional description"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="status" className="form-label">Status</label>
              <select id="status" name="status" className="form-select">
                <option value="TODO">TODO</option>
                <option value="Planning">Planning</option>
                <option value="Started">Started</option>
                <option value="Finished">Finished</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="type" className="form-label">Type</label>
              <input
                type="text"
                id="type"
                name="type"
                className="form-input"
                placeholder="e.g. Travel"
                list="new-type-suggestions"
              />
              <datalist id="new-type-suggestions">
                <option value="Travel" />
                <option value="Event" />
                <option value="Home" />
                <option value="Vehicle" />
                <option value="Education" />
                <option value="Health" />
                <option value="Entertainment" />
                <option value="Other" />
              </datalist>
            </div>
            <div className="form-group">
              <label htmlFor="budget" className="form-label">Budget</label>
              <input
                type="number"
                id="budget"
                name="budget"
                className="form-input"
                placeholder="Optional"
                min="0"
                step="0.01"
              />
            </div>
            <div className="dialog-form-actions">
              <button type="submit" className="btn btn-primary">Add activity</button>
            </div>
          </div>
        </form>
          </NewItemDialog>
        }
      />

      <div className="card">
        <ActivitiesTable activities={activityRows} />
      </div>
    </div>
  );
}
