export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { createProject } from '@/lib/actions/projects';
import { desc } from 'drizzle-orm';
import ProjectsTable from './ProjectsTable';

export default async function ProjectsPage() {
  const allProjects = await db.query.projects.findMany({
    orderBy: [desc(projects.createdAt)],
    with: {
      updates: {
        with: {
          updateTransactions: {
            with: { transaction: true },
          },
        },
      },
    },
  });

  const projectRows = allProjects.map((project) => {
    let totalCost = 0;
    for (const update of project.updates) {
      for (const ut of update.updateTransactions) {
        totalCost += parseFloat(ut.transaction.amount);
      }
    }

    const startedDates = project.updates
      .filter(u => u.newStatus === 'Started')
      .map(u => new Date(u.date).getTime());
    const finishedDates = project.updates
      .filter(u => u.newStatus === 'Finished')
      .map(u => new Date(u.date).getTime());

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      type: project.type,
      updateCount: project.updates.length,
      totalCost,
      startDate: startedDates.length > 0 ? new Date(Math.min(...startedDates)).toISOString() : null,
      endDate: finishedDates.length > 0 ? new Date(Math.min(...finishedDates)).toISOString() : null,
    };
  });

  return (
    <div>
      <h1 className="mb-4">Projects</h1>

      <div className="card mb-4">
        <h2 className="card-title">New Project</h2>
        <form action={createProject}>
          <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label htmlFor="name" className="form-label">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="e.g. Bathroom Renovation"
                required
              />
            </div>
            <div className="form-group" style={{ flex: '2 1 300px' }}>
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
            <div className="form-group" style={{ flex: '0 1 160px' }}>
              <label htmlFor="status" className="form-label">Status</label>
              <select id="status" name="status" className="form-select">
                <option value="TODO">TODO</option>
                <option value="Planning">Planning</option>
                <option value="Started">Started</option>
                <option value="Finished">Finished</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 1 180px' }}>
              <label htmlFor="type" className="form-label">Type</label>
              <input
                type="text"
                id="type"
                name="type"
                className="form-input"
                placeholder="e.g. Renovation"
                list="new-type-suggestions"
              />
              <datalist id="new-type-suggestions">
                <option value="Renovation" />
                <option value="Repair" />
                <option value="Upgrade" />
                <option value="Landscaping" />
                <option value="Maintenance" />
                <option value="New Construction" />
                <option value="Other" />
              </datalist>
            </div>
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Project</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <ProjectsTable projects={projectRows} />
      </div>
    </div>
  );
}
