export type CategoryWithParent = {
  id: number;
  parentId: number | null;
};

/**
 * Expands a list of selected category IDs so that any parent ID is replaced
 * by all of its children's IDs. Leaf IDs with no children pass through unchanged.
 * Returns a deduplicated array of leaf-level IDs suitable for DB queries.
 */
export function expandCategoryIds(
  selectedIds: number[],
  allCategories: CategoryWithParent[],
): number[] {
  const childrenByParent = new Map<number, number[]>();
  for (const cat of allCategories) {
    if (cat.parentId !== null) {
      const list = childrenByParent.get(cat.parentId) ?? [];
      list.push(cat.id);
      childrenByParent.set(cat.parentId, list);
    }
  }

  const expanded = new Set<number>();
  for (const id of selectedIds) {
    const children = childrenByParent.get(id);
    if (children && children.length > 0) {
      for (const childId of children) expanded.add(childId);
    } else {
      expanded.add(id);
    }
  }
  return Array.from(expanded);
}
