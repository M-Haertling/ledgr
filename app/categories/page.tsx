export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/categories';
import { asc } from 'drizzle-orm';
import EditCategoryForm from './EditCategoryForm';
import AddCategoryForm from './AddCategoryForm';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';

export default async function CategoriesPage() {
  const allCategories = await db.query.categories.findMany({
    orderBy: [asc(categories.name)],
    with: { children: true },
  });

  const usedColors = allCategories.map(c => c.color);
  const rootCategories = allCategories.filter(c => c.parentId === null);
  const parentOptions = rootCategories.map(c => ({ id: c.id, name: c.name }));

  const parents = rootCategories.filter(c => c.children.length > 0);
  const orphans = rootCategories.filter(c => c.children.length === 0);

  return (
    <div>
      <h1 className="mb-4">Manage Categories</h1>

      <div className="card">
        <h2 className="card-title">Add New Category</h2>
        <AddCategoryForm
          createAction={createCategory}
          usedColors={usedColors}
          parentOptions={parentOptions}
        />
      </div>

      <div className="list-container mt-4">
        {allCategories.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No categories found. Add one above.</p>
          </div>
        ) : (
          <>
            {parents.map((parent) => (
              <div key={parent.id}>
                <div className="list-item" style={{ background: 'var(--bg-secondary, #f8f9fa)' }}>
                  <EditCategoryForm
                    category={parent}
                    parentOptions={[]}
                    updateAction={updateCategory.bind(null, parent.id)}
                  />
                  <div className="flex gap-2">
                    <ConfirmDeleteButton action={deleteCategory.bind(null, parent.id)} />
                  </div>
                </div>
                {parent.children.map((child) => (
                  <div key={child.id} className="list-item" style={{ paddingLeft: '2rem' }}>
                    <EditCategoryForm
                      category={child}
                      parentOptions={parentOptions}
                      updateAction={updateCategory.bind(null, child.id)}
                    />
                    <div className="flex gap-2">
                      <ConfirmDeleteButton action={deleteCategory.bind(null, child.id)} />
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {orphans.length > 0 && (
              <>
                {parents.length > 0 && (
                  <div className="list-item" style={{ background: 'var(--bg-secondary, #f8f9fa)', fontWeight: 500, color: 'var(--text-muted)' }}>
                    Ungrouped
                  </div>
                )}
                {orphans.map((category) => (
                  <div key={category.id} className="list-item">
                    <EditCategoryForm
                      category={category}
                      parentOptions={parentOptions}
                      updateAction={updateCategory.bind(null, category.id)}
                    />
                    <div className="flex gap-2">
                      <ConfirmDeleteButton action={deleteCategory.bind(null, category.id)} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
