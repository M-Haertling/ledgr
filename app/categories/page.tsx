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
  });

  const usedColors = allCategories.map(c => c.color);

  return (
    <div>
      <h1 className="mb-4">Manage Categories</h1>

      <div className="card">
        <h2 className="card-title">Add New Category</h2>
        <AddCategoryForm createAction={createCategory} usedColors={usedColors} />
      </div>

      <div className="list-container mt-4">
        {allCategories.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No categories found. Add one above.</p>
          </div>
        ) : (
          allCategories.map((category) => (
            <div key={category.id} className="list-item">
              <EditCategoryForm
                category={category}
                updateAction={updateCategory.bind(null, category.id)}
              />
              <div className="flex gap-2">
                <ConfirmDeleteButton action={deleteCategory.bind(null, category.id)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
