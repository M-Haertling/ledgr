import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { CreateTagBody } from '@/lib/schemas/tags';

export async function GET() {
  try {
    const data = await db.query.tags.findMany();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateTagBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const [created] = await db.insert(tags).values({ name: result.data.name }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
