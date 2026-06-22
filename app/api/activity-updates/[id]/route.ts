import { db } from '@/lib/db';
import { activities, activityUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateActivityUpdateBody } from '@/lib/schemas/activity-updates';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const updateId = parseId((await params).id);
    if (!updateId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const update = await db.query.activityUpdates.findFirst({ where: eq(activityUpdates.id, updateId) });
    if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(update);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const updateId = parseId((await params).id);
    if (!updateId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const existing = await db.query.activityUpdates.findFirst({ where: eq(activityUpdates.id, updateId) });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const result = UpdateActivityUpdateBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const { content, date, newStatus } = result.data;
    const [updated] = await db.update(activityUpdates)
      .set({ content, newStatus: newStatus ?? null, date: new Date(date) })
      .where(eq(activityUpdates.id, updateId))
      .returning();

    if (newStatus) {
      await db.update(activities).set({ status: newStatus }).where(eq(activities.id, existing.activityId));
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const updateId = parseId((await params).id);
    if (!updateId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const [deleted] = await db.delete(activityUpdates)
      .where(eq(activityUpdates.id, updateId))
      .returning({ id: activityUpdates.id });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
