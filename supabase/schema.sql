create table if not exists public.vote_campaigns (
  id uuid primary key,
  title text not null check (char_length(title) between 1 and 100),
  max_selections smallint not null check (max_selections between 1 and 100),
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (closes_at is null or closes_at > opens_at)
);

create table if not exists public.emoji_candidates (
  id uuid primary key,
  campaign_id uuid not null references public.vote_campaigns(id) on delete cascade,
  code text not null,
  name text not null,
  set_key text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campaign_id, code),
  unique (campaign_id, id)
);

create table if not exists public.vote_submissions (
  id uuid primary key,
  campaign_id uuid not null references public.vote_campaigns(id) on delete restrict,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  feedback text check (feedback is null or char_length(feedback) <= 500),
  created_at timestamptz not null default now(),
  unique (campaign_id, id)
);

create table if not exists public.vote_choices (
  campaign_id uuid not null,
  submission_id uuid not null,
  candidate_id uuid not null,
  primary key (submission_id, candidate_id),
  foreign key (campaign_id, submission_id)
    references public.vote_submissions(campaign_id, id)
    on delete cascade,
  foreign key (campaign_id, candidate_id)
    references public.emoji_candidates(campaign_id, id)
    on delete restrict
);

create index if not exists emoji_candidates_campaign_order_idx
  on public.emoji_candidates(campaign_id, display_order);

create index if not exists vote_submissions_campaign_created_idx
  on public.vote_submissions(campaign_id, created_at);

create index if not exists vote_choices_campaign_candidate_idx
  on public.vote_choices(campaign_id, candidate_id);

create index if not exists vote_choices_campaign_submission_idx
  on public.vote_choices(campaign_id, submission_id);

alter table public.vote_campaigns enable row level security;
alter table public.emoji_candidates enable row level security;
alter table public.vote_submissions enable row level security;
alter table public.vote_choices enable row level security;

revoke all privileges on table
  public.vote_campaigns,
  public.emoji_candidates,
  public.vote_submissions,
  public.vote_choices
from public, anon, authenticated;

create or replace function public.submit_vote(
  p_campaign_id uuid,
  p_nickname text,
  p_candidate_ids uuid[],
  p_feedback text,
  p_submission_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text;
  v_feedback text;
  v_max_selections integer;
  v_choice_count integer;
  v_distinct_count integer;
  v_valid_count integer;
begin
  v_nickname := btrim(p_nickname);
  v_feedback := nullif(btrim(coalesce(p_feedback, '')), '');

  if p_submission_id is null then
    raise exception '제출 정보가 올바르지 않습니다.' using errcode = '22023';
  end if;

  if v_nickname is null or char_length(v_nickname) not between 1 and 20 then
    raise exception '닉네임은 1자 이상 20자 이하로 입력해 주세요.' using errcode = '22023';
  end if;

  if v_feedback is not null and char_length(v_feedback) > 500 then
    raise exception '수정 의견은 500자 이하로 입력해 주세요.' using errcode = '22023';
  end if;

  select campaign.max_selections
  into v_max_selections
  from public.vote_campaigns as campaign
  where campaign.id = p_campaign_id
    and campaign.is_published
    and now() >= campaign.opens_at
    and (campaign.closes_at is null or now() < campaign.closes_at);

  if not found then
    raise exception '현재 참여할 수 없는 투표입니다.' using errcode = '22023';
  end if;

  v_choice_count := coalesce(cardinality(p_candidate_ids), 0);

  if v_choice_count < 1 or v_choice_count > v_max_selections then
    raise exception '선택 가능한 이모티콘은 최대 %개입니다.', v_max_selections using errcode = '22023';
  end if;

  select count(distinct item.candidate_id)
  into v_distinct_count
  from unnest(p_candidate_ids) as item(candidate_id);

  if v_distinct_count <> v_choice_count then
    raise exception '같은 이모티콘을 한 번의 제출에서 중복 선택할 수 없습니다.' using errcode = '22023';
  end if;

  select count(*)
  into v_valid_count
  from unnest(p_candidate_ids) as item(candidate_id)
  join public.emoji_candidates as candidate
    on candidate.id = item.candidate_id
   and candidate.campaign_id = p_campaign_id
   and candidate.is_active;

  if v_valid_count <> v_choice_count then
    raise exception '선택 항목에 유효하지 않은 이모티콘이 포함되어 있습니다.' using errcode = '22023';
  end if;

  insert into public.vote_submissions (id, campaign_id, nickname, feedback)
  values (p_submission_id, p_campaign_id, v_nickname, v_feedback);

  insert into public.vote_choices (campaign_id, submission_id, candidate_id)
  select p_campaign_id, p_submission_id, item.candidate_id
  from unnest(p_candidate_ids) as item(candidate_id);

  return p_submission_id;
end;
$$;

revoke execute on function public.submit_vote(uuid, text, uuid[], text, uuid) from public, anon, authenticated;
grant execute on function public.submit_vote(uuid, text, uuid[], text, uuid) to anon;

insert into public.vote_campaigns (id, title, max_selections, is_published)
values ('d844f5be-88d4-4a98-95d4-cb6e569f68bf', '곰곰 이모티콘 투표', 5, true)
on conflict (id) do update
set title = excluded.title,
    max_selections = excluded.max_selections,
    is_published = excluded.is_published;

update public.emoji_candidates
set is_active = false,
    code = 'legacy-' || id::text
where campaign_id = 'd844f5be-88d4-4a98-95d4-cb6e569f68bf';

insert into public.emoji_candidates (id, campaign_id, code, name, set_key, display_order)
values
  ('efcb379e-3e8e-58d1-954e-3d5901357079', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '01', '제가요...?', 'question-reactions', 1),
  ('5112ad83-739e-510e-82a6-e5895e3150fe', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '02', '...?', 'question-reactions', 2),
  ('93c30762-575e-5a86-b192-169f4aebeba1', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '03', '뭐?', 'question-reactions', 3),
  ('f0c5a958-70fc-51ed-92c7-c748ae7df08f', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '04', '긴장 폭포', null, 4),
  ('7189a3f4-6400-5e3a-a421-0dd96d027695', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '05', '난가?', 'thinking', 5),
  ('ae8d39a0-3988-5846-a149-130e8c29d333', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '06', '흠...', 'thinking', 6),
  ('4c9231c5-629e-5ad7-9a24-0549a373d657', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '07', '수염 난 곰곰', null, 7),
  ('a744220d-acd1-5fe0-a8ec-446a58442d1e', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '08', '차원이 달라', null, 8),
  ('119b2b8e-e841-50b1-89f2-b7da09965de7', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '09', '회식 고?', 'work-go', 9),
  ('00bacb0b-0f26-51ba-899d-b87a17c766e6', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '10', '야근 고?', 'work-go', 10),
  ('849b0080-dcbd-54f4-a924-f6309c666b99', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '11', '알파 고?', 'work-go', 11),
  ('21dd0289-5bc0-5080-b497-9e05a2f501e8', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '12', 'MX☆ 야호~', null, 12),
  ('a73d71b4-aaf2-5e8f-90ed-5d9861330088', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '13', '굿~!', null, 13),
  ('c70a766c-fd89-484d-8615-f3300a870411', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '14', '한잔 해~', null, 14),
  ('5e70d59a-86be-475d-8222-b05a811d87ca', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '15', '안녕히 계세요 여러분~', null, 15),
  ('c67487de-2c8d-5adb-975f-adf4fb9d5c6a', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '16', '결재 부탁합니다', 'approval', 16),
  ('0be68ec9-8a21-5808-a2bb-ab826ccfe8a2', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '17', '결재 반려', 'approval', 17),
  ('e2c55c72-5642-584c-aa72-c20bd1c37364', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '18', '결재 진행시켜', 'approval', 18),
  ('75e6f2eb-863b-5587-a243-d46d275e0762', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '19', '이슈 있슈?', null, 19),
  ('fcfd095e-1dfe-5e5c-9b02-e28ec39eee85', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '20', '부르셨나요?', null, 20),
  ('e51f4102-27c0-58c6-85a5-8498fd249ba8', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '21', '커피 고?', null, 21),
  ('e6331ca5-b411-5f99-a932-8cdd8e2749f2', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '22', '죄송합니다', 'bow', 22),
  ('962090c8-3ee3-58e2-842e-dae1e9a36f70', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '23', '공손한 인사', 'bow', 23),
  ('b1758c68-81e3-54e3-b182-9e6219883737', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '24', '감사합니다', 'bow', 24),
  ('8fac4fc9-f80b-5428-bf48-57513f2b9add', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '25', '안녕하세요', null, 25),
  ('d1f1c353-3881-5dfd-b139-be08aa713f04', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '26', '분노 폭발', null, 26),
  ('0b1138ee-3494-5b92-acbd-332b3456eb1b', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '27', '가슴이 차가워', 'chest', 27),
  ('9ce58f8d-b36b-58a6-aac1-f7fc6eb10c90', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '28', '가슴이 뜨거워', 'chest', 28),
  ('92576c1a-8088-46df-a89a-c0f1c9effe09', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '29', '살펴보는 중', null, 29),
  ('c7e4fe93-e907-4894-afff-9b3a1a8edc3a', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '30', '야근...', null, 30),
  ('77bbe9fd-62b7-4c87-a051-ddf065a179dd', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '31', '이게 사는 건가?', null, 31),
  ('e4f08866-3b6f-422f-acc8-f087fc9434da', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '32', '병원 다녀오겠습니다', null, 32),
  ('d7c898e2-e2c3-4a7c-9cad-04a4c5b02173', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '33', '출근...', null, 33),
  ('1e955ae0-70fa-41d3-b578-71cba2fa881c', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '34', '리뷰 부탁드립니다', null, 34),
  ('1d34a28c-92f1-44bf-a82e-4e1b3e99512c', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '35', '또 회식?', null, 35),
  ('57bdf22f-e9fa-4477-88cb-3422288460c0', 'd844f5be-88d4-4a98-95d4-cb6e569f68bf', '36', '집 가고 싶다', null, 36)
on conflict (id) do update
set code = excluded.code,
    name = excluded.name,
    set_key = excluded.set_key,
    display_order = excluded.display_order,
    is_active = true;
