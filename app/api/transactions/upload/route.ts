import { db } from '@/lib/db';
import { transactions, mappings, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { loadRuleEngine, ruleMatchesTransaction, tagsForApplication, applyTransactionTags } from '@/lib/api/rules';
import { parseDateOnly } from '@/lib/utils/date';

type FailedRow = { rowNumber: number; row: string[]; reason: string };

export async function POST(req: Request) {
  try {
    const { accountId, csvData, mapping, templateName, saveTemplate, hasHeader = true } = await req.json();

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

    // Load categorization rules (with tags) for auto-categorization and auto-tagging
    const engine = await loadRuleEngine();

    const rows: string[][] = hasHeader ? csvData.slice(1) : csvData;
    let imported = 0;
    let skipped = 0;
    const failedRows: FailedRow[] = [];

    const fail = (rowIndex: number, row: string[], reason: string) => {
      failedRows.push({ rowNumber: rowIndex + (hasHeader ? 2 : 1), row, reason });
    };

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      // Skip blank rows
      if (row.every((cell: string) => !cell.trim())) continue;

      const dateStr = row[mapping.date];
      const description = row[mapping.description];

      if (!dateStr || !description) { fail(rowIndex, row, 'Missing date or description'); continue; }

      const date = parseDateOnly(dateStr);
      if (!date) { fail(rowIndex, row, `Invalid date: "${dateStr}"`); continue; }

      // Check for category from CSV if column is mapped
      let categoryIdFromCsv: number | null = null;
      if (mapping.category !== undefined) {
        const categoryName = row[mapping.category]?.trim();
        if (categoryName) {
          const categoryMatch = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.name, categoryName));
          if (categoryMatch.length > 0) {
            categoryIdFromCsv = categoryMatch[0].id;
          }
        }
      }

      let amount: number;
      let isCredit: boolean;

      // Handle separate credit/debit columns
      if (mapping.credit !== undefined || mapping.debit !== undefined) {
        const creditStr = mapping.credit !== undefined ? (row[mapping.credit] || '') : '';
        const debitStr = mapping.debit !== undefined ? (row[mapping.debit] || '') : '';
        const creditVal = parseFloat(creditStr.replace(/[^0-9.-]+/g, '')) || 0;
        const debitVal = parseFloat(debitStr.replace(/[^0-9.-]+/g, '')) || 0;
        if (creditVal !== 0) {
          amount = Math.abs(creditVal);
          isCredit = true;
        } else {
          amount = Math.abs(debitVal);
          isCredit = false;
        }
      } else {
        // Single amount column
        const amountStr = row[mapping.amount];
        if (!amountStr) { fail(rowIndex, row, 'Missing amount'); continue; }
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

      if (isNaN(amount) || amount === 0) { fail(rowIndex, row, 'Invalid or zero amount'); continue; }
      amount = Math.abs(amount);

      // Auto-categorize from the first matching rule (CSV category wins if present),
      // then apply both the rule's own tags and the assigned category's linked tags.
      let categoryId = categoryIdFromCsv || null;
      const matchedRule = engine.rules.find(rule => ruleMatchesTransaction(rule, description, parseInt(accountId)));
      if (matchedRule && matchedRule.categoryId && !categoryId) categoryId = matchedRule.categoryId;
      const tagIds = tagsForApplication(engine, matchedRule ?? null, categoryId);

      // Duplicate check enforced by unique constraint — ON CONFLICT DO NOTHING skips duplicates.
      const insertResult = await db.insert(transactions).values({
        accountId: parseInt(accountId),
        date,
        description,
        amount: amount.toString(),
        isCredit,
        type: isCredit ? 'credit' : 'debit',
        categoryId,
      }).onConflictDoNothing().returning({ id: transactions.id });

      if (insertResult[0]) {
        imported++;
        await applyTransactionTags(insertResult[0].id, tagIds);
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, imported, skipped, failed: failedRows.length, failedRows });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
