-- Expense shares settled by each payment: [{ "expenseId": "<uuid>", "amount": <number> }].
-- Empty array = legacy payment, deducted from the per-creditor total only.
alter table payments add column allocations jsonb not null default '[]'::jsonb;
