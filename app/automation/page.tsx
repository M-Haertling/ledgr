import { db } from '@/lib/db';
import { categorizationRules, categories } from '@/lib/db/schema';
import { createRule, deleteRule, applyRulesToUncategorized } from '@/lib/actions/rules';
import { desc } from 'drizzle-orm';

export default async function AutomationPage() {
  const allRules = await db.query.categorizationRules.findMany({
    with: {
      category: true,
    },
    orderBy: [desc(categorizationRules.priority), desc(categorizationRules.createdAt)],
  });

  const allCategories = await db.query.categories.findMany();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Automation Rules</h1>
        <form action={async () => {
          'use server';
          await applyRulesToUncategorized();
        }}>
          <button type="submit" className="btn btn-secondary">
            Apply to Uncategorized
          </button>
        </form>
      </div>
      
      <div className="card">
        <h2 className="card-title">Add New Rule</h2>
        <form action={createRule}>
          <div className="flex gap-4">
            <div className="form-group w-full">
              <label htmlFor="pattern" className="form-label">Pattern (Description contains)</label>
              <input 
                type="text" 
                id="pattern" 
                name="pattern" 
                className="form-input" 
                placeholder="e.g. STARBUCKS" 
                required 
              />
            </div>
            <div className="form-group w-full">
              <label htmlFor="categoryId" className="form-label">Category</label>
              <select id="categoryId" name="categoryId" className="form-select" required>
                <option value="">Select Category</option>
                {allCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ width: '150px' }}>
              <label htmlFor="priority" className="form-label">Priority</label>
              <input 
                type="number" 
                id="priority" 
                name="priority" 
                className="form-input" 
                defaultValue="0" 
              />
            </div>
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Rule</button>
            </div>
          </div>
        </form>
      </div>

      <div className="list-container mt-4">
        {allRules.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No rules found. Add one above.</p>
          </div>
        ) : (
          allRules.map((rule) => (
            <div key={rule.id} className="list-item">
              <div>
                <div className="list-item-title">Contains "{rule.pattern}"</div>
                <div className="flex gap-2 items-center mt-1">
                  <span className="badge" style={{ borderColor: rule.category.color || 'var(--border)' }}>
                    {rule.category.name}
                  </span>
                  <span className="list-item-subtitle">Priority: {rule.priority}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <form action={deleteRule.bind(null, rule.id)}>
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
