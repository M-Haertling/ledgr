import { db } from '@/lib/db';
import { activityUpdates } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { CreateActivityUpdateBody } from '@/lib/schemas/activity-updates';
import { syncActivityStatus } from '@/lib/api/activities';

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

    await syncActivityStatus(activityId);

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
