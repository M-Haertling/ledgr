import { db } from '@/lib/db';
import { categorizationRules } from '@/lib/db/schema';
import { asc, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { CreateRuleBody } from '@/lib/schemas/rules';

export async function GET() {
  try {
    const data = await db.query.categorizationRules.findMany({
      orderBy: [desc(categorizationRules.priority), asc(categorizationRules.id)],
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateRuleBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { pattern, categoryId, accountId, priority, ruleType } = result.data;
    const [created] = await db.insert(categorizationRules).values({
      pattern,
      categoryId,
      accountId: accountId ?? null,
      priority: priority ?? 0,
      ruleType: ruleType ?? null,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
