import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { CreateCategoryBody } from '@/lib/schemas/categories';

export async function GET() {
  try {
    const data = await db.query.categories.findMany({ orderBy: [asc(categories.name)] });
    return NextResponse.json({ data });
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
    const { name, color } = result.data;
    const [created] = await db.insert(categories).values({ name, color: color ?? null }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
