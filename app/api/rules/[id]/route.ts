import { db } from '@/lib/db';
import { categorizationRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateRuleBody } from '@/lib/schemas/rules';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ruleId = parseId((await params).id);
    if (!ruleId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const rule = await db.query.categorizationRules.findFirst({ where: eq(categorizationRules.id, ruleId) });
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const ruleId = parseId((await params).id);
    if (!ruleId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = UpdateRuleBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const { pattern, categoryId, accountId, priority, ruleType } = result.data;
    const [updated] = await db.update(categorizationRules)
      .set({ pattern, categoryId, accountId: accountId ?? null, priority: priority ?? 0, ruleType: ruleType ?? null })
      .where(eq(categorizationRules.id, ruleId))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const ruleId = parseId((await params).id);
    if (!ruleId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const [deleted] = await db.delete(categorizationRules)
      .where(eq(categorizationRules.id, ruleId))
      .returning({ id: categorizationRules.id });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
