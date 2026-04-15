import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  var __SWASTHYA_CLIENT: SupabaseClient | undefined;
}

// Keep bearer-token tables such as patient_access_tokens out of this list.
// Those flows use the raw service client so token validation/revocation is not
// coupled to header-injected clinic scoping.
const CLINIC_SCOPED_TABLES = new Set([
  'appointments',
  'audit_log',
  'bill_line_items',
  'bills',
  'clinic_users',
  'communication_events',
  'doctors',
  'patient_reports',
  'patients',
  'payment_events',
  'staff',
  'visit_history',
]);

type QueryState = {
  applied: boolean;
  clinicFilterSeen: boolean;
  clinicId: string;
  table: string;
};

type ProxyTarget = object;

function requireClinicId(clinicId: string): string {
  const normalizedClinicId = clinicId.trim();
  if (!normalizedClinicId) {
    throw new Error('Clinic-scoped database access requires a clinic_id.');
  }
  return normalizedClinicId;
}

function enforceClinicId(value: unknown, clinicId: string) {
  if (value == null) return;
  if (value !== clinicId) {
    throw new Error(
      `Mismatched clinic_id filter for scoped database access. Expected "${clinicId}".`
    );
  }
}

function withClinicId<T>(payload: T, clinicId: string): T {
  if (payload == null || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map((entry) => withClinicId(entry, clinicId)) as T;
  }

  const record = payload as Record<string, unknown>;
  enforceClinicId(record.clinic_id, clinicId);
  return { ...record, clinic_id: clinicId } as T;
}

function validateMutationPayload<T>(payload: T, clinicId: string): T {
  if (payload == null || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map((entry) => validateMutationPayload(entry, clinicId)) as T;
  }

  const record = payload as Record<string, unknown>;
  enforceClinicId(record.clinic_id, clinicId);
  return payload;
}

function applyClinicScope(builder: ProxyTarget, state: QueryState) {
  if (state.applied || !CLINIC_SCOPED_TABLES.has(state.table)) {
    return builder;
  }

  state.applied = true;
  if (!state.clinicFilterSeen) {
    return ((builder as { eq: (column: string, value: string) => ProxyTarget }).eq)(
      'clinic_id',
      state.clinicId
    );
  }

  return builder;
}

function wrapScopedBuilder(builder: ProxyTarget, state: QueryState): ProxyTarget {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        const scopedTarget = applyClinicScope(target, state);
        return (scopedTarget as { then: PromiseLike<unknown>['then'] }).then.bind(scopedTarget);
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]) => {
        let nextArgs = args;

        if (prop === 'eq' && args[0] === 'clinic_id') {
          enforceClinicId(args[1], state.clinicId);
          state.clinicFilterSeen = true;
        }

        if ((prop === 'insert' || prop === 'upsert') && CLINIC_SCOPED_TABLES.has(state.table)) {
          nextArgs = [withClinicId(args[0], state.clinicId), ...args.slice(1)];
        }

        if (prop === 'update' && CLINIC_SCOPED_TABLES.has(state.table)) {
          nextArgs = [validateMutationPayload(args[0], state.clinicId), ...args.slice(1)];
        }

        const result = (value as (...fnArgs: unknown[]) => unknown).apply(target, nextArgs);
        return result && typeof result === 'object'
          ? wrapScopedBuilder(result as ProxyTarget, state)
          : result;
      };
    },
  });
}

export function getDb(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
  }
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Supabase key is not configured.');

  if (!globalThis.__SWASTHYA_CLIENT) {
    globalThis.__SWASTHYA_CLIENT = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      key,
      { auth: { persistSession: false } }
    );
  }
  return globalThis.__SWASTHYA_CLIENT;
}

export function createClinicScopedDb(
  baseClient: SupabaseClient,
  clinicId: string
): SupabaseClient {
  const normalizedClinicId = requireClinicId(clinicId);

  return new Proxy(baseClient, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
          const builder = target.from(table);
          return wrapScopedBuilder(builder as ProxyTarget, {
            applied: false,
            clinicFilterSeen: false,
            clinicId: normalizedClinicId,
            table,
          });
        };
      }

      if (prop === 'rpc') {
        return (fn: string, args?: Record<string, unknown>, options?: Record<string, unknown>) => {
          if (args) {
            enforceClinicId(args.clinic_id, normalizedClinicId);
            enforceClinicId(args.p_clinic_id, normalizedClinicId);
          }
          return target.rpc(fn, args, options as Parameters<SupabaseClient['rpc']>[2]);
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}

export function getClinicDb(clinicId: string): SupabaseClient {
  return createClinicScopedDb(getDb(), clinicId);
}

/** Scoped query helper — all clinic queries go through this */
export function clinicQuery(clinicId: string) {
  const db = getClinicDb(clinicId);
  return {
    appointments: () => db.from('appointments').select('*'),
    patients: () => db.from('patients').select('*'),
    doctors: () => db.from('doctors').select('*'),
    auditLog: () => db.from('audit_log').select('*'),
  };
}

export async function getClinicBySlug(slug: string) {
  const { data } = await getDb()
    .from('clinics')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

export async function getClinicByDomain(domain: string) {
  const { data } = await getDb()
    .from('clinics')
    .select('*')
    .eq('custom_domain', domain)
    .single();
  return data;
}

export async function auditLog(
  clinicId: string,
  actor: string,
  action: string,
  targetId?: string,
  meta?: Record<string, unknown>
) {
  await getClinicDb(clinicId).from('audit_log').insert({
    actor,
    action,
    target_id: targetId ?? null,
    meta: meta ?? null,
  });
}
