import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { createTag, deleteTag } from '@/lib/actions/tags';
import { desc } from 'drizzle-orm';

export default async function TagsPage() {
  const allTags = await db.query.tags.findMany({
    orderBy: [desc(tags.createdAt)],
  });

  return (
    <div>
      <h1 className="mb-4">Manage Tags</h1>
      
      <div className="card">
        <h2 className="card-title">Add New Tag</h2>
        <form action={createTag}>
          <div className="flex gap-4">
            <div className="form-group w-full">
              <label htmlFor="name" className="form-label">Tag Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                className="form-input" 
                placeholder="e.g. Personal, Business, Vacation" 
                required 
              />
            </div>
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Tag</button>
            </div>
          </div>
        </form>
      </div>

      <div className="list-container mt-4">
        {allTags.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No tags found. Add one above.</p>
          </div>
        ) : (
          allTags.map((tag) => (
            <div key={tag.id} className="list-item">
              <div>
                <div className="list-item-title">#{tag.name}</div>
              </div>
              <div className="flex gap-2">
                <form action={deleteTag.bind(null, tag.id)}>
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
