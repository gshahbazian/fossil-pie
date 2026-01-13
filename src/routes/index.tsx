import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { TeamList } from '../components/team-list'
import { getUserLeagues, type League } from '../lib/yahoo'
import {
  decodeYahooToken,
  getCookieValue,
  isTokenExpired,
  type YahooOAuthToken,
} from '../lib/yahooAuth'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [token, setToken] = useState<YahooOAuthToken | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<League[] | null>(null)
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false)
  const [leaguesError, setLeaguesError] = useState<string | null>(null)
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)

  useEffect(() => {
    setToken(readYahooToken())
    const params = new URLSearchParams(window.location.search)
    setAuthError(params.get('auth_error'))
  }, [])

  useEffect(() => {
    if (!token || isTokenExpired(token)) return

    setIsLoadingLeagues(true)
    setLeaguesError(null)

    getUserLeagues()
      .then(setLeagues)
      .catch((error) => {
        setLeaguesError(
          error instanceof Error ? error.message : 'Failed to fetch leagues',
        )
      })
      .finally(() => setIsLoadingLeagues(false))
  }, [token])

  const isSignedIn = token && !isTokenExpired(token)

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-semibold">Fossil Pie</h1>

        {authError && (
          <p className="text-rose-300">
            OAuth error: <span className="font-semibold">{authError}</span>
          </p>
        )}

        {!isSignedIn && <SignInView />}

        {isSignedIn && !selectedLeague && (
          <LeaguePickerView
            leagues={leagues}
            isLoading={isLoadingLeagues}
            error={leaguesError}
            onSelect={setSelectedLeague}
          />
        )}

        {isSignedIn && selectedLeague && (
          <SelectedLeagueView
            league={selectedLeague}
            onBack={() => setSelectedLeague(null)}
          />
        )}
      </div>
    </main>
  )
}

function SignInView() {
  return (
    <div className="space-y-4">
      <p className="text-slate-300">
        Sign in with Yahoo to view your fantasy leagues.
      </p>
      <a
        className="inline-flex items-center justify-center rounded bg-slate-200 text-slate-900 px-4 py-2 font-medium hover:bg-slate-100 transition-colors"
        href="/api/auth"
      >
        Connect Yahoo
      </a>
    </div>
  )
}

type LeaguePickerViewProps = {
  leagues: League[] | null
  isLoading: boolean
  error: string | null
  onSelect: (league: League) => void
}

function LeaguePickerView({
  leagues,
  isLoading,
  error,
  onSelect,
}: LeaguePickerViewProps) {
  if (isLoading) {
    return <p className="text-slate-400">Loading leagues...</p>
  }

  if (error) {
    return <p className="text-rose-300">Error: {error}</p>
  }

  if (!leagues || leagues.length === 0) {
    return <p className="text-slate-400">No NBA leagues found.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-300">Select a league to view your team:</p>
      <div className="space-y-2">
        {leagues.map((league) => (
          <button
            key={league.league_key}
            type="button"
            className="w-full text-left rounded border border-slate-700 bg-slate-900 p-4 hover:border-slate-500 hover:bg-slate-800 transition-colors"
            onClick={() => onSelect(league)}
          >
            <p className="font-medium">{league.name}</p>
            <p className="text-sm text-slate-400">
              {league.num_teams} teams &middot; {league.season} season
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

type SelectedLeagueViewProps = {
  league: League
  onBack: () => void
}

function SelectedLeagueView({ league, onBack }: SelectedLeagueViewProps) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
        onClick={onBack}
      >
        &larr; Back to leagues
      </button>
      {league.team ? (
        <TeamList teamKey={league.team.team_key} leagueName={league.name} />
      ) : (
        <p className="text-rose-300">No team found for this league.</p>
      )}
    </div>
  )
}

function readYahooToken(): YahooOAuthToken | null {
  const raw = getCookieValue(document.cookie, 'yahoo_oauth')
  if (!raw) {
    return null
  }
  return decodeYahooToken(decodeURIComponent(raw))
}
