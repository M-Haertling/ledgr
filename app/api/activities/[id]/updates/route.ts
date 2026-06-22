import { db } from '@/lib/db';
import { activities, activityUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { CreateActivityUpdateBody } from '@/lib/schemas/activity-updates';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const activityId = parseInt((await params).id);
    if (isNaN(activityId)) return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });

    const result = CreateActivityUpdateBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { content, date, newStatus } = result.data;

    const [created] = await db.insert(activityUpdates).values({
      activityId,
      content,
      newStatus: newStatus ?? null,
      date: new Date(date),
    }).returning();

    if (newStatus) {
      await db.update(activities).set({ status: newStatus }).where(eq(activities.id, activityId));
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
