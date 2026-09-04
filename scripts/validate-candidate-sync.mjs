import { readFile } from 'node:fs/promises'

const candidateSource = await readFile('src/candidates.ts', 'utf8')
const schemaSource = await readFile('supabase/schema.sql', 'utf8')

const campaignId = candidateSource.match(/export const pollConfig = \{\s+id: '([^']+)'/)?.[1]
const minSelections = Number(candidateSource.match(/minSelections:\s*(\d+)/)?.[1])
const maxSelections = Number(candidateSource.match(/maxSelections:\s*(\d+)/)?.[1])
const campaignSeed = schemaSource.match(
  /insert into public\.vote_campaigns \(id, title, min_selections, max_selections, is_published\)\s+values \('([^']+)', '[^']+', (\d+), (\d+), (?:true|false)\)/,
)
const candidatePattern = /id: '([0-9a-f-]{36})',\s+code: '(\d{2})',\s+name: '([^']+)',[\s\S]*?setId: (?:'([^']+)'|null),/g
const schemaPattern = /\('([0-9a-f-]{36})', '([0-9a-f-]{36})', '(\d{2})', '([^']+)', (null|'[^']+'), (\d+)\)/g

const appCandidates = [...candidateSource.matchAll(candidatePattern)].map((match) => ({
  id: match[1],
  code: match[2],
  name: match[3],
  setId: match[4] ?? null,
}))

const databaseCandidates = [...schemaSource.matchAll(schemaPattern)].map((match) => ({
  id: match[1],
  campaignId: match[2],
  code: match[3],
  name: match[4],
  setId: match[5] === 'null' ? null : match[5].slice(1, -1),
  displayOrder: Number(match[6]),
}))

const fail = (message) => {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

if (!campaignId) fail('앱 캠페인 ID를 찾을 수 없습니다.')
if (!Number.isInteger(minSelections) || !Number.isInteger(maxSelections)) {
  fail('앱의 최소·최대 선택 수를 찾을 수 없습니다.')
}
if (minSelections < 1 || minSelections > maxSelections) {
  fail('앱의 최소·최대 선택 수가 올바르지 않습니다.')
}
if (!campaignSeed) fail('DB 캠페인 시드를 찾을 수 없습니다.')
if (campaignSeed[1] !== campaignId) fail('앱과 DB 캠페인 ID가 일치하지 않습니다.')
if (Number(campaignSeed[2]) !== minSelections || Number(campaignSeed[3]) !== maxSelections) {
  fail('앱과 DB의 최소·최대 선택 수가 일치하지 않습니다.')
}
if (appCandidates.length === 0) fail('앱 후보를 찾을 수 없습니다.')
if (appCandidates.length !== databaseCandidates.length) {
  fail(`앱 후보 ${appCandidates.length}개와 DB 후보 ${databaseCandidates.length}개가 일치하지 않습니다.`)
}

const uniqueAppIds = new Set(appCandidates.map((candidate) => candidate.id))
const uniqueAppCodes = new Set(appCandidates.map((candidate) => candidate.code))

if (uniqueAppIds.size !== appCandidates.length) fail('앱 후보 ID가 중복됐습니다.')
if (uniqueAppCodes.size !== appCandidates.length) fail('앱 후보 코드가 중복됐습니다.')

const databaseById = new Map(databaseCandidates.map((candidate) => [candidate.id, candidate]))

for (const candidate of appCandidates) {
  const databaseCandidate = databaseById.get(candidate.id)
  if (!databaseCandidate) fail(`${candidate.code} ${candidate.name} 후보가 DB 시드에 없습니다.`)
  if (databaseCandidate.campaignId !== campaignId) fail(`${candidate.code} 후보의 캠페인 ID가 다릅니다.`)
  if (databaseCandidate.code !== candidate.code) fail(`${candidate.name} 후보의 코드가 다릅니다.`)
  if (databaseCandidate.name !== candidate.name) fail(`${candidate.code} 후보의 이름이 다릅니다.`)
  if (databaseCandidate.setId !== candidate.setId) fail(`${candidate.code} 후보의 세트 ID가 다릅니다.`)
  if (databaseCandidate.displayOrder !== Number(candidate.code)) fail(`${candidate.code} 후보의 표시 순서가 다릅니다.`)
}

process.stdout.write(`후보 ${appCandidates.length}개 앱·DB 동기화 확인 완료\n`)
