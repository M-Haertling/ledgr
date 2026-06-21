import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateCategoryBody } from '@/lib/schemas/categories';
import { deleteCategoryWithCascade, assertParentDepth } from '@/lib/api/categories';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const categoryId = parseId((await params).id);
    if (!categoryId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
      with: { parent: { columns: { id: true, name: true } } },
    });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { parent, ...rest } = category;
    return NextResponse.json({ ...rest, parentName: parent?.name ?? null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const categoryId = parseId((await params).id);
    if (!categoryId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = UpdateCategoryBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const { name, color, parentId } = result.data;
    if (parentId) {
      if (parentId === categoryId) {
        return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
      }
      try { await assertParentDepth(parentId); }
      catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
    }

    const [updated] = await db.update(categories)
      .set({ name, color: color ?? null, parentId: parentId ?? null })
      .where(eq(categories.id, categoryId))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const categoryId = parseId((await params).id);
    if (!categoryId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const existing = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteCategoryWithCascade(categoryId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
