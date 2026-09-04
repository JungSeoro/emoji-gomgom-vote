# emoji-gomgom-vote

닉네임만 입력하고 곰곰 이모티콘 후보를 선택하는 모바일·데스크탑 투표 웹앱입니다. 후보를 갤럭시 메시지 화면 형태로 미리볼 수 있습니다.

## Docker로 실행

```bash
./docker/compose-toggle.sh vite-react emoji-gomgom-vote
```

접속 주소는 `http://localhost:3000`입니다. 같은 명령을 다시 실행하면 컨테이너가 종료됩니다.

`docker/`는 `web-dockerize` 저장소를 서브모듈로 사용합니다. 저장소를 새로 받을 때는 다음과 같이 내려받습니다.

```bash
git clone --recurse-submodules <repository-url>
```

이미 저장소를 받은 뒤라면 서브모듈을 초기화합니다.

```bash
git submodule update --init --recursive
```

현재 프로젝트를 처음 Git 저장소로 등록할 때는 루트에서 Docker 경로를 gitlink로 함께 스테이징합니다.

```bash
git init
git branch -M main
git add .gitmodules docker
git submodule init
git submodule absorbgitdirs docker
git add .
```

Node.js와 패키지는 컨테이너 안에서 설치됩니다. Supabase 환경변수가 없으면 제출 결과를 브라우저 `localStorage`에 저장하는 데모 모드로 실행됩니다.

## Supabase 연결

1. Supabase 프로젝트의 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. Project Settings에서 Project URL과 Publishable key를 확인합니다.
3. `.env.example`을 `.env.local`로 복사하고 실제 값을 등록합니다.
4. GitHub Repository Variables에도 같은 값을 등록합니다.

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

결과 확인용 쿼리는 `supabase/results.sql`에 있습니다. 익명 사용자는 제출만 가능하며 투표 내역과 결과는 조회할 수 없습니다.

## 관리자 결과 페이지

관리자 화면은 기존 투표 화면에 링크가 없으며 `https://배포주소/#/results`로 직접 접속합니다. Supabase가 연결된 환경에서만 사용할 수 있습니다.

1. 최신 `supabase/schema.sql`을 적용합니다.
2. Supabase Edge Function `vote-results`를 JWT 검사 없이 배포합니다.
3. 안전한 로컬 도구에서 PostgreSQL `pgcrypto`와 호환되는 `$2a$`, cost 12 이상의 bcrypt 해시를 만든 뒤 SQL Editor에는 해시만 등록합니다. 평문 비밀번호는 SQL Editor에 입력하지 않습니다.

```sql
insert into private.vote_result_access (singleton, password_hash, updated_at)
values (
  true,
  '$2a$12$로컬에서_생성한_bcrypt_해시',
  now()
)
on conflict (singleton) do update
set password_hash = excluded.password_hash,
    updated_at = excluded.updated_at;

delete from private.vote_result_sessions;
```

```bash
supabase functions deploy vote-results --no-verify-jwt
```

관리자 화면에서는 닉네임 일부로 제출 내역을 필터링할 수 있으며, 후보별 득표 집계와 피드백 목록도 같은 필터를 따릅니다. 비밀번호 원문과 Service role key는 프런트 코드에 포함하지 않습니다. bcrypt 제한에 맞춰 비밀번호는 UTF-8 기준 72바이트 이하로 설정합니다. 로그인은 IP별 5회 실패 시 15분 동안 제한되며, 접근 세션은 최대 2시간·미사용 30분 후 만료됩니다. 세션 토큰은 현재 탭의 `sessionStorage`에만 저장됩니다.

GitHub Pages 기본 주소 외의 도메인에서 관리자 화면을 사용할 때는 Edge Function secret `ADMIN_RESULTS_ALLOWED_ORIGINS`에 허용할 Origin을 쉼표로 구분해 등록합니다.

## 후보와 세트 추가

후보 정보는 `src/candidates.ts`에서 관리합니다. 같은 행에 속하는 후보들은 하나의 `CandidateGroup` 안에 넣고 `isSet: true`로 설정합니다. 각 후보의 `setId`에는 같은 세트 식별자를 넣습니다. 후보 ID와 캠페인의 최소·최대 선택 수는 `supabase/schema.sql`에도 동일하게 반영해야 합니다.

현재 PNG 36개를 등록했습니다. 같은 행에 있던 6개 그룹은 세트로 구성했고 나머지 20개는 단독 후보로 구성했습니다. 중복된 `Frame 435.png`와 해당 후보는 제거하고 `Frame 12.png`만 유지합니다.

고해상도 PNG 원본은 `asset`에 보존하고, 화면에서는 빈 여백을 정리한 `asset/optimized`의 긴 변 640px WebP를 사용합니다. 원본을 교체하거나 추가한 뒤 실행 중인 컨테이너에서 다음 명령으로 파생본을 다시 생성합니다.

```bash
docker compose \
  --env-file docker/.env \
  --project-name emoji-gomgom-vote \
  --file docker/docker-compose-vite-react.yml \
  exec react npm run assets:optimize
```

## GitHub Pages 배포

1. GitHub에 `emoji-gomgom-vote` 저장소를 생성합니다.
2. 현재 프로젝트를 `main` 브랜치에 푸시합니다.
3. 저장소 `Settings → Pages → Source`에서 `GitHub Actions`를 선택합니다.
4. `Settings → Secrets and variables → Actions → Variables`에 Supabase 변수 두 개를 등록합니다.
5. 개인 도메인은 Pages의 `Custom domain`에 `vote.example.com`처럼 등록합니다.
6. DNS에 `CNAME vote → GITHUB아이디.github.io`를 추가하고 `Enforce HTTPS`를 켭니다.

Vite의 `base`는 상대 경로로 설정되어 기본 프로젝트 주소와 개인 도메인에서 모두 정적 리소스를 불러올 수 있습니다.

## 설정

- 최소 선택 수: `src/candidates.ts`의 `pollConfig.minSelections`
- 최대 선택 수: `src/candidates.ts`의 `pollConfig.maxSelections`
- 의견 최대 글자 수: `src/candidates.ts`의 `pollConfig.feedbackMaxLength`
- 투표 공개 상태: Supabase `vote_campaigns.is_published`
- 투표 마감: Supabase `vote_campaigns.closes_at`
