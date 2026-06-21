import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { CreateCategoryBody } from '@/lib/schemas/categories';
import { assertParentDepth } from '@/lib/api/categories';

export async function GET() {
  try {
    const data = await db.query.categories.findMany({
      orderBy: [asc(categories.name)],
      with: { parent: { columns: { id: true, name: true } } },
    });
    const result = data.map(({ parent, ...c }) => ({
      ...c,
      parentName: parent?.name ?? null,
    }));
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateCategoryBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { name, color, parentId } = result.data;
    if (parentId) {
      try { await assertParentDepth(parentId); }
      catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
    }
    const [created] = await db.insert(categories)
      .values({ name, color: color ?? null, parentId: parentId ?? null })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
