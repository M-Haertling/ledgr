export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { tags, categories, categoryTags } from '@/lib/db/schema';
import { createTag, deleteTag, updateTag } from '@/lib/actions/tags';
import { desc } from 'drizzle-orm';
import EditTagForm from './EditTagForm';
import PageHeader from '@/app/components/PageHeader';
import NewItemDialog from '@/app/components/NewItemDialog';
import CategoryTagManager from './CategoryTagManager';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import Icon from '@/app/components/Icon';

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
      <PageHeader
        title="Tags"
        count={allTags.length}
        actions={
          <NewItemDialog label="New tag" title="New tag">
            <form action={createTag} className="dialog-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Tag Name</label>
                <input type="text" id="name" name="name" className="form-input" placeholder="e.g. Personal, Business, Vacation" required />
              </div>
              <div className="dialog-form-actions">
                <button type="submit" className="btn btn-primary">Add tag</button>
              </div>
            </form>
          </NewItemDialog>
        }
      />

      <div className="list-container" style={{ marginTop: 0 }}>
        {allTags.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No tags yet. Use "+ New tag" to add one.</p>
          </div>
        ) : (
          allTags.map((tag) => (
            <div key={tag.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div className="flex w-full" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <EditTagForm tag={tag} updateAction={updateTag.bind(null, tag.id)} />
                <ConfirmDeleteButton action={deleteTag.bind(null, tag.id)} className="icon-btn icon-btn-danger" label={<Icon name="trash" />} confirmLabel="Delete?" title="Delete (click twice)" />
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
