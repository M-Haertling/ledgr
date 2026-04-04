import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { createCategory, deleteCategory } from '@/lib/actions/categories';
import { desc } from 'drizzle-orm';

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
            <div className="form-group w-full">
              <label htmlFor="color" className="form-label">Color (Hex)</label>
              <input 
                type="text" 
                id="color" 
                name="color" 
                className="form-input" 
                placeholder="e.g. #ef4444" 
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
              <div className="flex items-center gap-2">
                {category.color && (
                  <div 
                    style={{ backgroundColor: category.color, width: '12px', height: '12px', borderRadius: '50%' }} 
                  />
                )}
                <div className="list-item-title">{category.name}</div>
              </div>
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
