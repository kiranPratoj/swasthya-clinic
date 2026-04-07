-- Add unique constraint so seed-auth-user.mjs can upsert safely
alter table clinic_users
  add constraint clinic_users_auth_user_clinic_unique
  unique (auth_user_id, clinic_id);
