import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateCategoryBody } from '@/lib/schemas/categories';
import { deleteCategoryWithCascade } from '@/lib/api/categories';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const categoryId = parseId((await params).id);
    if (!categoryId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(category);
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

    const { name, color } = result.data;
    const [updated] = await db.update(categories)
      .set({ name, color: color ?? null })
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
