# 09_READING_ORDER

If you are a human engineer or an LLM new to this repository, read the files in this order to build your mental model fastest:

1. **`docs/repo-handover/00_REPO_EXECUTIVE_SUMMARY.md`** - The 10,000-foot view.
2. **`docs/repo-handover/07_OPERATING_GUIDE_FOR_FUTURE_LLMS.md`** - Critical safety rules and invariants.
3. **`src/lib/types.ts`** - The definitive domain language of the app.
4. **`src/proxy.ts`** - How multi-tenancy and auth routing actually work.
5. **`supabase/migrations/20260406000000_clinic_init.sql`** - The database schema and constraints.
6. **`src/app/actions.ts`** - Where all the database mutations happen.
7. **`docs/repo-handover/04_REQUEST_RESPONSE_AND_DATA_FLOW.md`** - How the pieces tie together end-to-end.
8. **`docs/repo-handover/02_ARCHITECTURE_AND_BOUNDARIES.md`** - Architectural constraints.

Once you have read these files, you are cleared to start making edits safely.
