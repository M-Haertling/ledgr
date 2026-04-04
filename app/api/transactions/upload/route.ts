import { db } from '@/lib/db';
import { transactions, mappings, categorizationRules } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { accountId, csvData, mapping, templateName, saveTemplate } = await req.json();

    if (!accountId || !csvData || !mapping) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save/Update template if requested
    if (saveTemplate && templateName) {
      await db.insert(mappings).values({
        accountId: parseInt(accountId),
        name: templateName,
        config: mapping,
      }).onConflictDoUpdate({
        target: [mappings.accountId, mappings.name],
        set: { config: mapping },
      });
    }

    // Get categorization rules for auto-categorization
    const rules = await db.query.categorizationRules.findMany({
      orderBy: [sql`priority DESC`],
    });

    const rows = csvData.slice(1); // Skip header
    const insertedCount = 0;
    
    // Process rows
    for (const row of rows) {
      const dateStr = row[mapping.date];
      const description = row[mapping.description];
      const amountStr = row[mapping.amount];
      const isCreditCol = mapping.isCredit !== undefined ? row[mapping.isCredit] : null;

      if (!dateStr || !description || !amountStr) continue;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      // Handle amount and isCredit
      let amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));
      let isCredit = amount > 0;
      
      if (isCreditCol !== null) {
        // If bank provides a specific column for Credit/Debit
        const lowerVal = isCreditCol.toLowerCase();
        if (lowerVal === 'credit' || lowerVal === 'cr' || lowerVal === 'y' || lowerVal === 'true') {
          isCredit = true;
        } else if (lowerVal === 'debit' || lowerVal === 'dr' || lowerVal === 'n' || lowerVal === 'false') {
          isCredit = false;
        }
      }

      // Check for duplicates
      const existing = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.accountId, parseInt(accountId)),
          eq(transactions.date, date),
          eq(transactions.description, description),
          eq(transactions.amount, amount.toString())
        ),
      });

      if (existing) continue;

      // Auto-categorize
      let categoryId = null;
      for (const rule of rules) {
        if (description.toLowerCase().includes(rule.pattern.toLowerCase())) {
          categoryId = rule.categoryId;
          break;
        }
      }

      await db.insert(transactions).values({
        accountId: parseInt(accountId),
        date,
        description,
        amount: amount.toString(),
        isCredit,
        categoryId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
