import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/categories';
import { desc } from 'drizzle-orm';
import EditCategoryForm from './EditCategoryForm';

export default async function CategoriesPage() {
  const allCategories = await db.query.categories.findMany({
    orderBy: [desc(categories.createdAt)],
  });

  return (
    <div>
      <h1 className="mb-4">Manage Categories</h1>

      <div className="card">
        <h2 className="card-title">Add New Category</h2>
        <form action={createCategory}>
          <div className="flex gap-4">
            <div className="form-group w-full">
              <label htmlFor="name" className="form-label">Category Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="e.g. Groceries"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="color" className="form-label">Color</label>
              <input
                type="color"
                id="color"
                name="color"
                defaultValue="#6366f1"
                style={{ width: '40px', height: '38px', padding: '2px', border: '1px solid var(--border)', borderRadius: '0.375rem', cursor: 'pointer' }}
              />
            </div>
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Category</button>
            </div>
          </div>
        </form>
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
                <form action={deleteCategory.bind(null, category.id)}>
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
