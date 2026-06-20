import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateTagBody } from '@/lib/schemas/tags';
import { deleteTagWithCascade } from '@/lib/api/tags';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const tagId = parseId((await params).id);
    if (!tagId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const tag = await db.query.tags.findFirst({ where: eq(tags.id, tagId) });
    if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const tagId = parseId((await params).id);
    if (!tagId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = UpdateTagBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const [updated] = await db.update(tags).set({ name: result.data.name }).where(eq(tags.id, tagId)).returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const tagId = parseId((await params).id);
    if (!tagId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const existing = await db.query.tags.findFirst({ where: eq(tags.id, tagId) });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteTagWithCascade(tagId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
