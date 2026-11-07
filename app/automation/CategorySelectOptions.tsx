import type { CategoryOption } from './RuleDialog';

/**
 * <option>s for a category <select>, with parents rendered as <optgroup>s so
 * children are indented natively in the open list but show their plain name
 * once selected. The parent itself stays selectable as the group's first option.
 * Standalone categories (no children) are grouped under "Other" when any
 * parents exist, otherwise listed flat.
 */
export default function CategorySelectOptions({ options }: { options: CategoryOption[] }) {
  const groups: { parent: CategoryOption; children: CategoryOption[] }[] = [];
  const standalone: CategoryOption[] = [];
  for (const o of options) {
    if (o.isParent) groups.push({ parent: o, children: [] });
    else if (o.indent && groups.length > 0) groups[groups.length - 1].children.push(o);
    else standalone.push(o);
  }

  if (groups.length === 0) {
    return <>{standalone.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>;
  }

  return (
    <>
      {groups.map(({ parent, children }) => (
        <optgroup key={parent.id} label={parent.name}>
          <option value={parent.id}>{parent.name}</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      ))}
      {standalone.length > 0 && (
        <optgroup label="Other">
          {standalone.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      )}
    </>
  );
}
