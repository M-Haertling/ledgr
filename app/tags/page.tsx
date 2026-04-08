export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { tags, categories, categoryTags } from '@/lib/db/schema';
import { createTag, deleteTag, updateTag } from '@/lib/actions/tags';
import { desc } from 'drizzle-orm';
import EditTagForm from './EditTagForm';
import CategoryTagManager from './CategoryTagManager';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';

export default async function TagsPage() {
  const [allTags, allCategories, allCategoryTags] = await Promise.all([
    db.query.tags.findMany({ orderBy: [desc(tags.createdAt)] }),
    db.select().from(categories).orderBy(categories.name),
    db.select().from(categoryTags),
  ]);

  // Build a map of tagId -> categoryIds
  const tagCategoryMap = new Map<number, number[]>();
  for (const ct of allCategoryTags) {
    const existing = tagCategoryMap.get(ct.tagId) ?? [];
    existing.push(ct.categoryId);
    tagCategoryMap.set(ct.tagId, existing);
  }

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
            <div key={tag.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div className="flex w-full" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <EditTagForm tag={tag} updateAction={updateTag.bind(null, tag.id)} />
                <ConfirmDeleteButton action={deleteTag.bind(null, tag.id)} />
              </div>
              <div className="flex items-center gap-2" style={{ paddingLeft: '0.25rem' }}>
                <span className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>Auto-tag categories:</span>
                <CategoryTagManager
                  tagId={tag.id}
                  allCategories={allCategories}
                  linkedCategoryIds={tagCategoryMap.get(tag.id) ?? []}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
