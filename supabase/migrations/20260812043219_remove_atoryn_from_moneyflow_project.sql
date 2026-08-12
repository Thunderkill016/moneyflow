drop function if exists public.atoryn_cloud_ack(text,text,bigint,text,jsonb,text,text) restrict;
drop function if exists public.atoryn_cloud_activity(text,text,integer) restrict;
drop function if exists public.atoryn_cloud_claim(text,text,bigint,text) restrict;
drop function if exists public.atoryn_cloud_enqueue(text,text,jsonb,text) restrict;
drop function if exists public.atoryn_cloud_get_document(text,text) restrict;
drop function if exists public.atoryn_cloud_get_project(text,text) restrict;
drop function if exists public.atoryn_cloud_heartbeat(text,text,text,text,text,text,text,jsonb) restrict;
drop function if exists public.atoryn_cloud_list_commands(text,text,bigint,integer) restrict;
drop function if exists public.atoryn_cloud_revision(text,text,text,text,jsonb,text) restrict;
drop function if exists public.atoryn_cloud_save_document(text,text,jsonb,text,text,text) restrict;
drop function if exists public.atoryn_cloud_project_id(text,text) restrict;

drop table if exists public.atoryn_cloud_clients restrict;
drop table if exists public.atoryn_cloud_documents restrict;
drop table if exists public.atoryn_cloud_audit restrict;
drop table if exists public.atoryn_cloud_revisions restrict;
drop table if exists public.atoryn_cloud_commands restrict;
drop table if exists public.atoryn_cloud_projects restrict;
drop table if exists public.atoryn_design_commands restrict;

delete from supabase_migrations.schema_migrations
where version in (
  '20260804171954',
  '20260804184225',
  '20260804184624',
  '20260805050340',
  '20260805050355',
  '20260805050413',
  '20260805050429'
);;
