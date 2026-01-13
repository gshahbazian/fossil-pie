import { useEffect, useState } from 'react'
import { getRoster, type Player } from '../lib/yahoo'

type TeamListProps = {
  teamKey: string
  leagueName: string
}

export function TeamList({ teamKey, leagueName }: TeamListProps) {
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    getRoster(teamKey)
      .then(setPlayers)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch roster')
      })
      .finally(() => setIsLoading(false))
  }, [teamKey])

  return (
    <div className="space-y-4">
      <p className="text-slate-300">
        Viewing team for <span className="font-semibold">{leagueName}</span>
      </p>

      {isLoading && <p className="text-slate-400">Loading roster...</p>}

      {error && <p className="text-rose-300">Error: {error}</p>}

      {!isLoading && !error && players && (
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.player_key}
              className="flex items-center gap-3 rounded border border-slate-800 bg-slate-900 p-3"
            >
              {player.headshot_url && (
                <img
                  src={player.headshot_url}
                  alt={player.name}
                  className="h-10 w-10 rounded-full bg-slate-800"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {player.name}
                  {player.status && (
                    <span className="ml-2 text-xs text-rose-400">
                      {player.status}
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-400">
                  {player.nba_team && (
                    <span className="text-slate-300">{player.nba_team}</span>
                  )}
                  {player.nba_team && ' · '}
                  {player.position}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && players?.length === 0 && (
        <p className="text-slate-400">No players on roster.</p>
      )}
    </div>
  )
}
