import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { CreateProjectBody } from '@/lib/schemas/projects';

export async function GET() {
  try {
    const data = await db.query.projects.findMany();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateProjectBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { name, description, status, type } = result.data;
    const [created] = await db.insert(projects).values({
      name,
      description: description ?? null,
      status: status ?? 'TODO',
      type: type ?? null,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
