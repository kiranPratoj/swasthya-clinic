import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClinicScopedDb } from './db';

class FakeBuilder {
  filters: Array<[string, unknown]> = [];
  inserted: unknown = null;

  constructor(readonly table: string) {}

  select() {
    return this;
  }

  insert(payload: unknown) {
    this.inserted = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  then(
    onFulfilled?: (value: { data: { filters: Array<[string, unknown]>; inserted: unknown; table: string } }) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) {
    return Promise.resolve({
      data: {
        filters: this.filters,
        inserted: this.inserted,
        table: this.table,
      },
    }).then(onFulfilled, onRejected);
  }
}

function createFakeClient(): SupabaseClient {
  return {
    from(table: string) {
      return new FakeBuilder(table);
    },
    rpc() {
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient;
}

test('clinic-scoped db auto-applies clinic_id filters to tenant tables', async () => {
  const db = createClinicScopedDb(createFakeClient(), 'clinic-123');
  const result = await db.from('appointments').select('*') as unknown as {
    data: { filters: Array<[string, unknown]>; inserted: unknown; table: string };
  };

  assert.deepEqual(result.data.filters, [['clinic_id', 'clinic-123']]);
});

test('clinic-scoped db injects clinic_id into inserts', async () => {
  const db = createClinicScopedDb(createFakeClient(), 'clinic-123');
  const result = await db.from('patients').insert({ name: 'Asha' }) as unknown as {
    data: { filters: Array<[string, unknown]>; inserted: unknown; table: string };
  };

  assert.deepEqual(result.data.inserted, {
    clinic_id: 'clinic-123',
    name: 'Asha',
  });
});

test('clinic-scoped db rejects missing clinic IDs', () => {
  assert.throws(
    () => createClinicScopedDb(createFakeClient(), ''),
    /clinic_id/i
  );
});

test('clinic-scoped db rejects mismatched clinic filters', () => {
  const db = createClinicScopedDb(createFakeClient(), 'clinic-123');

  assert.throws(
    () => db.from('appointments').select('*').eq('clinic_id', 'clinic-999'),
    /Mismatched clinic_id filter/i
  );
});
