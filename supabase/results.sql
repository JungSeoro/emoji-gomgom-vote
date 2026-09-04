select
  candidate.code,
  candidate.name,
  candidate.set_key,
  count(choice.submission_id)::integer as vote_count
from public.emoji_candidates as candidate
left join public.vote_choices as choice
  on choice.candidate_id = candidate.id
where candidate.campaign_id = 'd844f5be-88d4-4a98-95d4-cb6e569f68bf'
  and candidate.is_active
group by candidate.id
order by vote_count desc, candidate.display_order;

select
  submission.nickname,
  submission.feedback,
  submission.created_at,
  string_agg(candidate.code, ', ' order by candidate.display_order) as selected_codes
from public.vote_submissions as submission
join public.vote_choices as choice
  on choice.submission_id = submission.id
join public.emoji_candidates as candidate
  on candidate.id = choice.candidate_id
 and candidate.is_active
where submission.campaign_id = 'd844f5be-88d4-4a98-95d4-cb6e569f68bf'
group by submission.id
order by submission.created_at desc;
