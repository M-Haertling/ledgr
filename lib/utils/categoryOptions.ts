type CategoryFlat = {
  id: number;
  name: string;
  color?: string | null;
  parentId?: number | null;
  parentName?: string | null;
};

type CategoryOption = {
  id: number;
  name: string;
  color?: string | null;
  isParent?: boolean;
  indent?: boolean;
};

/**
 * Converts a flat category list (with parentId/parentName) into a sorted array
 * suitable for rendering in MultiSelect: parents first (bold), children below (indented),
 * then standalone categories.
 */
export function buildCategoryOptions(cats: CategoryFlat[]): CategoryOption[] {
  const parents = cats.filter(c => c.parentId === null && cats.some(ch => ch.parentId === c.id));
  const children = cats.filter(c => c.parentId !== null);
  const standalone = cats.filter(c => c.parentId === null && !cats.some(ch => ch.parentId === c.id));

  const result: CategoryOption[] = [];
  for (const parent of parents) {
    result.push({ id: parent.id, name: parent.name, color: parent.color, isParent: true });
    const kids = children
      .filter(c => c.parentId === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const child of kids) {
      result.push({ id: child.id, name: child.name, color: child.color, indent: true });
    }
  }
  for (const cat of standalone) {
    result.push({ id: cat.id, name: cat.name, color: cat.color });
  }
  return result;
}
