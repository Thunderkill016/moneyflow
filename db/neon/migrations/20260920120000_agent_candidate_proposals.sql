-- Write-capability proposals (#617): agents propose inbox candidates, humans approve.
-- 'agent' joins the candidate source enum. Proposing OAuth client identity rides
-- inside source_external_id under the existing `|` namespace convention, so no
-- new column or archive/restore contract change is needed.

alter type public.inbox_candidate_source add value if not exists 'agent';
