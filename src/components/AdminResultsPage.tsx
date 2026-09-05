import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  MessageCircleMore,
  MousePointerClick,
  RefreshCw,
  Search,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import {
  AdminAccessError,
  clearAdminSession,
  fetchVoteResults,
  getAdminSessionDeadline,
  hasAdminSession,
  isAdminConfigured,
  maxExcludedSubmissionCount,
  retryPendingAdminLogout,
  signInAdmin,
  signOutAdmin,
  type VoteResultsData,
} from '../adminService'
import { candidates } from '../candidates'

const localCandidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
const numberFormatter = new Intl.NumberFormat('ko-KR')
const percentFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof Error) || !error.message.trim()) return fallback

  return error.message
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function AdminResultsPage() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [authError, setAuthError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [appliedFilter, setAppliedFilter] = useState('')
  const [results, setResults] = useState<VoteResultsData | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState('')
  const [excludedSubmissionIds, setExcludedSubmissionIds] = useState<string[]>([])
  const requestIdRef = useRef(0)
  const requestedFilterRef = useRef('')
  const requestedPageRef = useRef(1)
  const retryFilterRef = useRef('')
  const retryPageRef = useRef(1)
  const requestedExcludedSubmissionIdsRef = useRef<string[]>([])
  const confirmedFilterRef = useRef('')
  const confirmedPageRef = useRef(1)
  const excludedSubmissionIdsRef = useRef<string[]>([])
  const confirmedExcludedSubmissionIdsRef = useRef<string[]>([])
  const lastReturnCheckRef = useRef(0)
  const activeResultRequestsRef = useRef(0)

  useEffect(() => {
    const previousTitle = document.title
    document.title = '투표 결과 | 곰곰 이모티콘'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const replaceExcludedSubmissionIds = useCallback((submissionIds: readonly string[]) => {
    const nextSubmissionIds = [...submissionIds]
    excludedSubmissionIdsRef.current = nextSubmissionIds
    setExcludedSubmissionIds(nextSubmissionIds)
  }, [])

  const lockDashboard = useCallback((message: string) => {
    requestIdRef.current += 1
    clearAdminSession()
    setAuthenticated(false)
    setResults(null)
    setResultsLoading(false)
    setSearchInput('')
    setAppliedFilter('')
    requestedFilterRef.current = ''
    requestedPageRef.current = 1
    retryFilterRef.current = ''
    retryPageRef.current = 1
    confirmedFilterRef.current = ''
    confirmedPageRef.current = 1
    requestedExcludedSubmissionIdsRef.current = []
    confirmedExcludedSubmissionIdsRef.current = []
    replaceExcludedSubmissionIds([])
    setAuthError(message)
  }, [replaceExcludedSubmissionIds])

  const loadResults = useCallback(async (
    nicknameFilter = '',
    page = 1,
    requestedExcludedSubmissionIds: readonly string[] = excludedSubmissionIdsRef.current,
  ) => {
    const normalizedFilter = nicknameFilter.trim()
    const normalizedExcludedSubmissionIds = [...requestedExcludedSubmissionIds]
    const requestId = ++requestIdRef.current
    requestedFilterRef.current = normalizedFilter
    requestedPageRef.current = page
    retryFilterRef.current = normalizedFilter
    retryPageRef.current = page
    requestedExcludedSubmissionIdsRef.current = normalizedExcludedSubmissionIds
    activeResultRequestsRef.current += 1
    setResultsLoading(true)
    setResultsError('')

    try {
      const nextResults = await fetchVoteResults(
        normalizedFilter,
        page,
        normalizedExcludedSubmissionIds,
      )
      if (requestId !== requestIdRef.current) return
      setResults(nextResults)
      setAppliedFilter(nextResults.nicknameFilter)
      requestedFilterRef.current = nextResults.nicknameFilter
      requestedPageRef.current = nextResults.page
      confirmedFilterRef.current = nextResults.nicknameFilter
      confirmedPageRef.current = nextResults.page
      confirmedExcludedSubmissionIdsRef.current = [...nextResults.excludedSubmissionIds]
      replaceExcludedSubmissionIds(nextResults.excludedSubmissionIds)
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      const message = getErrorMessage(error, '투표 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')

      if (error instanceof AdminAccessError) {
        lockDashboard(message)
        return
      }

      requestedFilterRef.current = confirmedFilterRef.current
      requestedPageRef.current = confirmedPageRef.current
      replaceExcludedSubmissionIds(confirmedExcludedSubmissionIdsRef.current)
      setResultsError(message)
    } finally {
      activeResultRequestsRef.current = Math.max(0, activeResultRequestsRef.current - 1)
      if (requestId === requestIdRef.current) setResultsLoading(false)
    }
  }, [lockDashboard, replaceExcludedSubmissionIds])

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      if (!isAdminConfigured) {
        setCheckingSession(false)
        return
      }

      try {
        try {
          await retryPendingAdminLogout()
        } catch {}

        if (cancelled) return
        const session = hasAdminSession()
        if (cancelled) return
        setAuthenticated(session)
        if (session) await loadResults()
      } catch (error) {
        if (cancelled) return
        setAuthError(getErrorMessage(error, '관리자 로그인 상태를 확인하지 못했습니다.'))
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
      requestIdRef.current += 1
    }
  }, [loadResults])

  useEffect(() => {
    if (!authenticated) return

    let timeoutId: number | null = null

    const checkSession = (refreshFromServer: boolean) => {
      if (activeResultRequestsRef.current > 0) return

      if (!hasAdminSession()) {
        lockDashboard('접근 시간이 만료되었습니다. 비밀번호를 다시 입력해 주세요.')
        return
      }

      if (refreshFromServer) {
        void loadResults(appliedFilter, results?.page ?? 1)
      }
    }

    const scheduleExpiryCheck = () => {
      if (activeResultRequestsRef.current > 0) {
        timeoutId = window.setTimeout(scheduleExpiryCheck, 250)
        return
      }

      const deadline = getAdminSessionDeadline()
      if (deadline === null) {
        lockDashboard('접근 시간이 만료되었습니다. 비밀번호를 다시 입력해 주세요.')
        return
      }

      timeoutId = window.setTimeout(() => {
        if (activeResultRequestsRef.current > 0) {
          timeoutId = window.setTimeout(scheduleExpiryCheck, 250)
          return
        }

        if (!hasAdminSession()) {
          lockDashboard('접근 시간이 만료되었습니다. 비밀번호를 다시 입력해 주세요.')
          return
        }

        scheduleExpiryCheck()
      }, Math.max(0, deadline - Date.now() + 50))
    }

    const checkSessionOnReturn = () => {
      if (document.visibilityState !== 'visible') return

      const now = Date.now()
      if (now - lastReturnCheckRef.current < 1000) return
      lastReturnCheckRef.current = now
      checkSession(true)
    }

    lastReturnCheckRef.current = Date.now()
    scheduleExpiryCheck()
    document.addEventListener('visibilitychange', checkSessionOnReturn)
    window.addEventListener('focus', checkSessionOnReturn)

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', checkSessionOnReturn)
      window.removeEventListener('focus', checkSessionOnReturn)
    }
  }, [appliedFilter, authenticated, loadResults, lockDashboard, results])

  const rankedCandidates = useMemo(() => {
    if (!results) return []
    return [...results.candidateVotes].sort(
      (left, right) => right.voteCount - left.voteCount || left.displayOrder - right.displayOrder,
    )
  }, [results])

  const selectionCount = useMemo(
    () => results?.candidateVotes.reduce((total, candidate) => total + candidate.voteCount, 0) ?? 0,
    [results],
  )

  const excludedSubmissionIdSet = useMemo(
    () => new Set(excludedSubmissionIds),
    [excludedSubmissionIds],
  )

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (signingIn || signingOut) return

    setSigningIn(true)
    setAuthError('')

    try {
      await signInAdmin(password)
      setAuthenticated(true)
      setSearchInput('')
      setAppliedFilter('')
      requestedFilterRef.current = ''
      requestedPageRef.current = 1
      retryFilterRef.current = ''
      retryPageRef.current = 1
      confirmedFilterRef.current = ''
      confirmedPageRef.current = 1
      requestedExcludedSubmissionIdsRef.current = []
      confirmedExcludedSubmissionIdsRef.current = []
      replaceExcludedSubmissionIds([])
      await loadResults()
    } catch (error) {
      setAuthenticated(false)
      setAuthError(getErrorMessage(error, '관리자 로그인에 실패했습니다.'))
    } finally {
      setPassword('')
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    if (signingOut) return

    setSigningOut(true)
    setResultsError('')
    setAuthError('')
    requestIdRef.current += 1
    setAuthenticated(false)
    setResults(null)
    setSearchInput('')
    setAppliedFilter('')
    requestedFilterRef.current = ''
    requestedPageRef.current = 1
    retryFilterRef.current = ''
    retryPageRef.current = 1
    confirmedFilterRef.current = ''
    confirmedPageRef.current = 1
    requestedExcludedSubmissionIdsRef.current = []
    confirmedExcludedSubmissionIdsRef.current = []
    replaceExcludedSubmissionIds([])
    setPassword('')

    try {
      await signOutAdmin()
    } catch {
      setAuthError('이 브라우저에서는 로그아웃했지만 서버 세션 종료를 확인하지 못했습니다.')
    } finally {
      setSigningOut(false)
    }
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadResults(searchInput, 1)
  }

  const clearFilter = () => {
    setSearchInput('')
    void loadResults('', 1)
  }

  const handleSubmissionExclusion = (submissionId: string) => {
    const currentSubmissionIds = excludedSubmissionIdsRef.current
    const isExcluded = currentSubmissionIds.includes(submissionId)

    if (!isExcluded && currentSubmissionIds.length >= maxExcludedSubmissionCount) {
      setResultsError(`집계 제외 항목은 최대 ${maxExcludedSubmissionCount}개까지 선택할 수 있어요.`)
      return
    }

    const nextSubmissionIds = isExcluded
      ? currentSubmissionIds.filter((currentId) => currentId !== submissionId)
      : [...currentSubmissionIds, submissionId]

    replaceExcludedSubmissionIds(nextSubmissionIds)
    void loadResults(
      requestedFilterRef.current,
      requestedPageRef.current,
      nextSubmissionIds,
    )
  }

  const clearExcludedSubmissions = () => {
    replaceExcludedSubmissionIds([])
    void loadResults(requestedFilterRef.current, requestedPageRef.current, [])
  }

  if (!isAdminConfigured) {
    return (
      <main className="admin-page admin-page-centered">
        <section className="admin-state-card" aria-labelledby="admin-config-title">
          <span className="admin-state-kicker">PRIVATE DASHBOARD</span>
          <h1 id="admin-config-title" className="admin-state-title">관리자 설정이 필요합니다</h1>
          <p className="admin-state-copy">Supabase 환경변수를 설정한 뒤 다시 접속해 주세요.</p>
        </section>
      </main>
    )
  }

  if (checkingSession) {
    return (
      <main className="admin-page admin-page-centered" aria-busy="true">
        <div className="admin-loading-state" role="status" aria-live="polite">
          <RefreshCw className="admin-loading-icon" size={28} aria-hidden="true" />
          결과 페이지 접근 상태를 확인하고 있습니다.
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="admin-page admin-page-centered">
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <div className="admin-login-heading">
            <span className="admin-login-kicker">PRIVATE DASHBOARD</span>
            <h1 id="admin-login-title" className="admin-login-title">투표 결과 확인</h1>
            <p className="admin-login-copy">관리자 비밀번호를 입력해 주세요.</p>
          </div>

          <form className="admin-login-form" onSubmit={handleSignIn} aria-busy={signingIn || signingOut}>
            <div className="admin-field">
              <label className="admin-field-label" htmlFor="admin-password">비밀번호</label>
              <input
                className="admin-field-input"
                id="admin-password"
                type="password"
                value={password}
                autoComplete="current-password"
                maxLength={72}
                required
                autoFocus
                disabled={signingIn || signingOut}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (authError) setAuthError('')
                }}
              />
            </div>

            {authError && <div className="admin-alert" role="alert">{authError}</div>}

            <button className="admin-login-button" type="submit" disabled={signingIn || signingOut}>
              <LogIn size={18} strokeWidth={2.8} aria-hidden="true" />
              {signingOut ? '로그아웃 중…' : signingIn ? '로그인 중…' : '결과 확인하기'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  const hasAggregatedSubmissions = Boolean(results && results.aggregatedSubmissionCount > 0)
  const submissionRangeStart = results && results.submissions.length > 0
    ? (results.page - 1) * results.pageSize + 1
    : 0
  const submissionRangeEnd = results
    ? Math.min(results.page * results.pageSize, results.matchedSubmissionCount)
    : 0
  const totalPages = results
    ? Math.max(1, Math.ceil(results.matchedSubmissionCount / results.pageSize))
    : 1

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header-copy">
          <span className="admin-header-kicker">GOMGOM VOTE · PRIVATE</span>
          <h1 className="admin-header-title">투표 결과 모아보기</h1>
          <p className="admin-header-description">닉네임으로 제출을 찾고 필요한 항목만 제외해 결과를 다시 집계하세요.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-refresh-button"
            type="button"
            onClick={() => void loadResults(appliedFilter, results?.page ?? 1)}
            disabled={resultsLoading || signingOut}
          >
            <RefreshCw
              className={`admin-refresh-icon${resultsLoading ? ' admin-refresh-icon-loading' : ''}`}
              size={18}
              aria-hidden="true"
            />
            {resultsLoading ? '불러오는 중…' : '새로고침'}
          </button>
          <button
            className="admin-signout-button"
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut || resultsLoading}
          >
            <LogOut size={18} strokeWidth={2.6} aria-hidden="true" />
            {signingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-search-section" aria-labelledby="admin-search-title">
          <div className="admin-section-heading">
            <div className="admin-section-heading-copy">
              <span className="admin-section-kicker">NICKNAME FILTER</span>
              <h2 id="admin-search-title" className="admin-section-title">닉네임으로 찾아보기</h2>
            </div>
            {appliedFilter && (
              <div className="admin-filter-status" role="status">
                <span className="admin-filter-label">검색 중</span>
                <strong className="admin-filter-value">{appliedFilter}</strong>
                <button
                  className="admin-filter-clear"
                  type="button"
                  onClick={clearFilter}
                  disabled={resultsLoading}
                >
                  <X size={16} aria-hidden="true" />
                  <span className="admin-filter-clear-label">닉네임 검색 해제</span>
                </button>
              </div>
            )}
          </div>

          <form className="admin-search-form" role="search" onSubmit={handleSearch}>
            <label className="admin-search-label" htmlFor="admin-nickname-search">닉네임 검색</label>
            <div className="admin-search-control">
              <Search className="admin-search-icon" size={21} aria-hidden="true" />
              <input
                className="admin-search-input"
                id="admin-nickname-search"
                type="search"
                value={searchInput}
                maxLength={20}
                placeholder="닉네임 일부를 입력하세요"
                aria-describedby="admin-search-help"
                disabled={resultsLoading}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              {searchInput && (
                <button
                  className="admin-search-reset"
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setSearchInput('')}
                  disabled={resultsLoading}
                >
                  <X size={17} aria-hidden="true" />
                </button>
              )}
            </div>
            <button className="admin-search-button" type="submit" disabled={resultsLoading}>
              검색
            </button>
          </form>
          <p className="admin-search-help" id="admin-search-help">
            닉네임의 일부만 입력해도 일치하는 제출 결과와 피드백을 찾습니다.
          </p>
        </section>

        {resultsError && (
          <div className="admin-alert admin-results-alert" role="alert">
            <span className="admin-alert-message">{resultsError}</span>
            <button
              className="admin-alert-retry"
              type="button"
              onClick={() => void loadResults(
                retryFilterRef.current,
                retryPageRef.current,
                requestedExcludedSubmissionIdsRef.current,
              )}
              disabled={resultsLoading}
            >
              다시 시도
            </button>
          </div>
        )}

        {resultsLoading && !results && (
          <div className="admin-loading-state" role="status" aria-live="polite">
            <RefreshCw className="admin-loading-icon" size={26} aria-hidden="true" />
            투표 결과를 불러오고 있습니다.
          </div>
        )}

        {results && (
          <div className="admin-results" aria-live="polite" aria-busy={resultsLoading}>
            <section className="admin-kpi-section" aria-label="투표 요약">
              <article className="admin-kpi-card">
                <Users size={23} aria-hidden="true" />
                <span className="admin-kpi-label">전체 제출</span>
                <strong className="admin-kpi-value">{numberFormatter.format(results.totalSubmissionCount)}</strong>
                <span className="admin-kpi-unit">명</span>
              </article>
              <article className="admin-kpi-card admin-kpi-card-highlight">
                <Search size={23} aria-hidden="true" />
                <span className="admin-kpi-label">검색 결과</span>
                <strong className="admin-kpi-value">{numberFormatter.format(results.matchedSubmissionCount)}</strong>
                <span className="admin-kpi-unit">명</span>
              </article>
              <article className="admin-kpi-card">
                <UserMinus size={23} aria-hidden="true" />
                <span className="admin-kpi-label">집계 대상</span>
                <strong className="admin-kpi-value">{numberFormatter.format(results.aggregatedSubmissionCount)}</strong>
                <span className="admin-kpi-unit">명</span>
              </article>
              <article className="admin-kpi-card">
                <MessageCircleMore size={23} aria-hidden="true" />
                <span className="admin-kpi-label">피드백</span>
                <strong className="admin-kpi-value">{numberFormatter.format(results.feedbackCount)}</strong>
                <span className="admin-kpi-unit">건</span>
              </article>
              <article className="admin-kpi-card">
                <MousePointerClick size={23} aria-hidden="true" />
                <span className="admin-kpi-label">선택 수</span>
                <strong className="admin-kpi-value">{numberFormatter.format(selectionCount)}</strong>
                <span className="admin-kpi-unit">표</span>
              </article>
            </section>

            <div className="admin-dashboard-grid">
              <section
                className="admin-ranking-section"
                id="admin-vote-display"
                aria-labelledby="admin-ranking-title"
              >
                <div className="admin-section-heading">
                  <div className="admin-section-heading-copy">
                    <span className="admin-section-kicker">VOTE RANKING</span>
                    <h2 id="admin-ranking-title" className="admin-section-title">후보별 득표 순위</h2>
                  </div>
                  <BarChart3 size={27} aria-hidden="true" />
                </div>

                {hasAggregatedSubmissions ? (
                  <ol className="admin-ranking-list">
                    {rankedCandidates.map((candidate, index) => {
                      const localCandidate = localCandidatesById.get(candidate.candidateId)
                      const voteRate = results.aggregatedSubmissionCount > 0
                        ? (candidate.voteCount / results.aggregatedSubmissionCount) * 100
                        : 0

                      return (
                        <li className="admin-ranking-item" key={candidate.candidateId}>
                          <span className="admin-ranking-position">{index + 1}</span>
                          {localCandidate ? (
                            <img
                              className="admin-ranking-image"
                              src={localCandidate.image}
                              alt={localCandidate.description}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="admin-ranking-image-placeholder" aria-hidden="true">#{candidate.code}</span>
                          )}
                          <div className="admin-ranking-content">
                            <div className="admin-ranking-summary">
                              <span className="admin-ranking-code">#{candidate.code}</span>
                              <strong className="admin-ranking-name">{localCandidate?.name ?? candidate.name}</strong>
                              <span className="admin-ranking-count">{numberFormatter.format(candidate.voteCount)}표</span>
                            </div>
                            <div className="admin-ranking-rate">
                              <progress
                                className="admin-ranking-progress"
                                max={100}
                                value={voteRate}
                                aria-label={`${localCandidate?.name ?? candidate.name} 득표율`}
                              />
                              <span className="admin-ranking-percent">{percentFormatter.format(voteRate)}%</span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <div className="admin-empty-state">
                    <BarChart3 size={28} aria-hidden="true" />
                    <strong className="admin-empty-title">표시할 득표 결과가 없습니다</strong>
                    <p className="admin-empty-copy">
                      {results.matchedSubmissionCount > 0
                        ? '검색 결과가 모두 집계에서 제외되었습니다.'
                        : '검색 조건을 바꾸거나 새 투표가 제출된 뒤 다시 확인해 주세요.'}
                    </p>
                  </div>
                )}
              </section>

              <section className="admin-submissions-section" aria-labelledby="admin-submissions-title">
                <div className="admin-section-heading">
                  <div className="admin-section-heading-copy">
                    <span className="admin-section-kicker">SUBMISSIONS &amp; FEEDBACK</span>
                    <h2 id="admin-submissions-title" className="admin-section-title">제출 결과와 피드백</h2>
                  </div>
                  <div className="admin-submission-heading-actions">
                    <span className="admin-section-count">
                      {submissionRangeStart > 0
                        ? `${numberFormatter.format(submissionRangeStart)}–${numberFormatter.format(submissionRangeEnd)} / `
                        : ''}
                      {numberFormatter.format(results.matchedSubmissionCount)}건
                    </span>
                    <span className="admin-exclusion-status" role="status">
                      {numberFormatter.format(excludedSubmissionIds.length)}건 제외
                    </span>
                    <button
                      className="admin-exclusion-clear"
                      type="button"
                      aria-label="집계 제외 항목 전체 초기화"
                      disabled={excludedSubmissionIds.length === 0}
                      onClick={clearExcludedSubmissions}
                    >
                      <X size={14} aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </div>
                <p className="admin-submission-select-help" id="admin-submission-select-help">
                  제출 항목을 누르면 집계에서 제외하거나 다시 포함할 수 있으며, 검색·페이지 변경에도 유지됩니다.
                </p>

                {results.submissions.length > 0 ? (
                  <div className="admin-submission-list">
                    {results.submissions.map((submission) => {
                      const selectedCandidates = [...submission.selectedCandidates].sort(
                        (left, right) => left.displayOrder - right.displayOrder,
                      )
                      const isExcluded = excludedSubmissionIdSet.has(submission.id)

                      return (
                        <article
                          className={`admin-submission-card${isExcluded ? ' admin-submission-card-excluded' : ''}`}
                          key={submission.id}
                        >
                          <button
                            className="admin-submission-select-button"
                            type="button"
                            aria-label={`${submission.nickname}님의 제출 ${submission.id.slice(0, 8)} ${isExcluded ? '집계에 다시 포함' : '집계에서 제외'}`}
                            aria-pressed={isExcluded}
                            aria-controls="admin-vote-display"
                            aria-describedby="admin-submission-select-help"
                            onClick={() => handleSubmissionExclusion(submission.id)}
                          />
                          <header className="admin-submission-header">
                            <div className="admin-submission-person">
                              <strong className="admin-submission-nickname">{submission.nickname}</strong>
                              <span className="admin-submission-id">{submission.id.slice(0, 8)}</span>
                              <span
                                className={`admin-submission-status-badge${isExcluded ? ' admin-submission-status-badge-excluded' : ''}`}
                              >
                                {isExcluded ? '집계 제외' : '집계 포함'}
                              </span>
                            </div>
                            <time className="admin-submission-date" dateTime={submission.createdAt}>
                              {formatDate(submission.createdAt)}
                            </time>
                          </header>

                          <div className="admin-submission-selection">
                            <span className="admin-submission-selection-label">선택 {selectedCandidates.length}개</span>
                            <ul className="admin-selected-code-list" aria-label={`${submission.nickname}님의 선택 목록`}>
                              {selectedCandidates.map((candidate) => (
                                <li className="admin-selected-code-item" key={candidate.candidateId}>
                                  <span
                                    className="admin-selected-code"
                                    title={candidate.name}
                                    aria-label={`${candidate.code}번 ${candidate.name}`}
                                  >
                                    #{candidate.code}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className={`admin-feedback${submission.feedback ? ' admin-feedback-filled' : ' admin-feedback-empty'}`}>
                            <span className="admin-feedback-label">피드백</span>
                            <p className="admin-feedback-copy">
                              {submission.feedback || '남긴 피드백이 없습니다.'}
                            </p>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    <MessageCircleMore size={28} aria-hidden="true" />
                    <strong className="admin-empty-title">
                      {appliedFilter ? '검색된 제출 결과가 없습니다' : '아직 제출된 투표가 없습니다'}
                    </strong>
                    <p className="admin-empty-copy">
                      {appliedFilter ? '다른 닉네임으로 검색해 보세요.' : '새 투표가 제출되면 이곳에 표시됩니다.'}
                    </p>
                  </div>
                )}

                {(results.hasPreviousPage || results.hasNextPage) && (
                  <nav className="admin-pagination" aria-label="제출 결과 페이지">
                    <button
                      className="admin-pagination-button"
                      type="button"
                      onClick={() => void loadResults(appliedFilter, results.page - 1)}
                      disabled={!results.hasPreviousPage || resultsLoading}
                    >
                      <ChevronLeft size={17} aria-hidden="true" />
                      이전
                    </button>
                    <span className="admin-pagination-status" aria-current="page">
                      <strong>{numberFormatter.format(results.page)}</strong>
                      <span>/ {numberFormatter.format(totalPages)}</span>
                    </span>
                    <button
                      className="admin-pagination-button"
                      type="button"
                      onClick={() => void loadResults(appliedFilter, results.page + 1)}
                      disabled={!results.hasNextPage || resultsLoading}
                    >
                      다음
                      <ChevronRight size={17} aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
