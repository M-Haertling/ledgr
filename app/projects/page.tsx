export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { projects, projectUpdates, projectUpdateTransactions, transactions } from '@/lib/db/schema';
import { createProject, deleteProject } from '@/lib/actions/projects';
import { desc, eq, sum, sql } from 'drizzle-orm';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'TODO',
  Planning: 'Planning',
  Started: 'Started',
  Finished: 'Finished',
};

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  Planning: '#3b82f6',
  Started: '#f59e0b',
  Finished: '#22c55e',
};

export default async function ProjectsPage() {
  const allProjects = await db.query.projects.findMany({
    orderBy: [desc(projects.createdAt)],
    with: {
      updates: {
        with: {
          updateTransactions: {
            with: {
              transaction: true,
            },
          },
        },
      },
    },
  });

  const projectsWithStats = allProjects.map((project) => {
    let totalCost = 0;
    let updateCount = project.updates.length;
    for (const update of project.updates) {
      for (const ut of update.updateTransactions) {
        totalCost += parseFloat(ut.transaction.amount);
      }
    }
    return { ...project, totalCost, updateCount };
  });

  return (
    <div>
      <h1 className="mb-4">Projects</h1>

      <div className="card">
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
              <input
                type="text"
                id="description"
                name="description"
                className="form-input"
                placeholder="Optional description"
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
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Project</button>
            </div>
          </div>
        </form>
      </div>

      <div className="list-container mt-4">
        {projectsWithStats.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No projects yet. Add one above.</p>
          </div>
        ) : (
          projectsWithStats.map((project) => (
            <div key={project.id} className="list-item">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link href={`/projects/${project.id}`} className="list-item-title" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {project.name}
                  </Link>
                  <span
                    className="badge"
                    style={{ backgroundColor: STATUS_COLORS[project.status] + '22', color: STATUS_COLORS[project.status], borderColor: STATUS_COLORS[project.status] + '44' }}
                  >
                    {STATUS_LABELS[project.status] ?? project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="list-item-subtitle" style={{ marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.description}
                  </p>
                )}
                <div className="flex gap-4 mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>{project.updateCount} update{project.updateCount !== 1 ? 's' : ''}</span>
                  <span>Total: ${project.totalCost.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/projects/${project.id}`} className="btn btn-sm" style={{ border: '1px solid var(--border)' }}>
                  View
                </Link>
                <form action={deleteProject.bind(null, project.id)}>
                  <button type="submit" className="btn btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
