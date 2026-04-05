import { db } from '@/lib/db';
import { transactions, mappings, categorizationRules, transactionTags } from '@/lib/db/schema';
import { NextResponse } from 'next/server';

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

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
      orderBy: (rules, { desc }) => [desc(rules.priority)],
    });

    const rows = csvData.slice(1); // Skip header
    let importedCount = 0;

    for (const row of rows) {
      const dateStr = row[mapping.date];
      const description = row[mapping.description];

      if (!dateStr || !description) continue;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      let amount: number;
      let isCredit: boolean;

      // Handle separate credit/debit columns
      if (mapping.credit !== undefined || mapping.debit !== undefined) {
        const creditStr = mapping.credit !== undefined ? (row[mapping.credit] || '') : '';
        const debitStr = mapping.debit !== undefined ? (row[mapping.debit] || '') : '';
        const creditVal = parseFloat(creditStr.replace(/[^0-9.-]+/g, '')) || 0;
        const debitVal = parseFloat(debitStr.replace(/[^0-9.-]+/g, '')) || 0;
        if (creditVal > 0) {
          amount = creditVal;
          isCredit = true;
        } else {
          amount = debitVal;
          isCredit = false;
        }
      } else {
        // Single amount column
        const amountStr = row[mapping.amount];
        if (!amountStr) continue;
        amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
        isCredit = amount > 0;

        const isCreditCol = mapping.isCredit !== undefined ? row[mapping.isCredit] : null;
        if (isCreditCol !== null) {
          const lowerVal = isCreditCol.toLowerCase();
          if (lowerVal === 'credit' || lowerVal === 'cr' || lowerVal === 'y' || lowerVal === 'true') {
            isCredit = true;
          } else if (lowerVal === 'debit' || lowerVal === 'dr' || lowerVal === 'n' || lowerVal === 'false') {
            isCredit = false;
          }
        }
      }

      if (isNaN(amount) || amount === 0) continue;
      amount = Math.abs(amount);

      // Auto-categorize and auto-tag
      let categoryId = null;
      let matchedTagId = null;
      for (const rule of rules) {
        if (rule.accountId && rule.accountId !== parseInt(accountId)) continue;
        const regex = patternToRegex(rule.pattern);
        if (!regex.test(description)) continue;
        if (rule.categoryId) categoryId = rule.categoryId;
        if (rule.tagId) matchedTagId = rule.tagId;
        break;
      }

      // Duplicate check is handled by the unique constraint on (account_id, date, description, amount).
      // ON CONFLICT DO NOTHING silently skips duplicates.
      const inserted = await db.insert(transactions).values({
        accountId: parseInt(accountId),
        date,
        description,
        amount: amount.toString(),
        isCredit,
        categoryId,
      }).onConflictDoNothing().returning({ id: transactions.id });

      if (inserted[0]) {
        importedCount++;
        if (matchedTagId) {
          await db.insert(transactionTags)
            .values({ transactionId: inserted[0].id, tagId: matchedTagId })
            .onConflictDoNothing();
        }
      }
    }

    return NextResponse.json({ success: true, imported: importedCount });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
