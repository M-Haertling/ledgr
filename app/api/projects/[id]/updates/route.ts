import { db } from '@/lib/db';
import { projects, projectUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { CreateProjectUpdateBody } from '@/lib/schemas/project-updates';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const projectId = parseInt((await params).id);
    if (isNaN(projectId)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

    const result = CreateProjectUpdateBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { content, date, newStatus } = result.data;

    const [created] = await db.insert(projectUpdates).values({
      projectId,
      content,
      newStatus: newStatus ?? null,
      date: new Date(date),
    }).returning();

    if (newStatus) {
      await db.update(projects).set({ status: newStatus }).where(eq(projects.id, projectId));
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
