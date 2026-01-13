export type Team = {
  team_key: string
  team_id: string
  name: string
}

export type League = {
  league_key: string
  name: string
  num_teams: number
  season: string
  team: Team | null
}

type YahooTeamData = {
  team_key: string
  team_id: string
  name: string
}

type YahooLeagueData = {
  league_key: string
  name: string
  num_teams: number
  season: string
}

// Yahoo API returns objects with numeric string keys instead of arrays
// e.g., { "0": {...}, "1": {...}, "count": 2 }
type YahooIndexedObject<T> = {
  [key: string]: T | number
  count: number
}

type YahooFantasyContent = {
  fantasy_content: {
    users: YahooIndexedObject<{
      user: Array<
        | { guid: string }
        | {
            games: YahooIndexedObject<{
              game: Array<
                | { game_key: string }
                | {
                    leagues: YahooIndexedObject<{
                      league: Array<
                        | YahooLeagueData
                        | {
                            teams: YahooIndexedObject<{
                              team: Array<
                                YahooTeamData | Record<string, unknown>
                              >
                            }>
                          }
                      >
                    }>
                  }
              >
            }>
          }
      >
    }>
  }
}

// Helper to iterate over Yahoo's indexed objects (skipping 'count')
function getIndexedValues<T>(obj: YahooIndexedObject<T>): T[] {
  const values: T[] = []
  for (let i = 0; i < obj.count; i++) {
    const item = obj[i.toString()]
    if (item !== undefined && typeof item !== 'number') {
      values.push(item)
    }
  }
  return values
}

function parseLeaguesFromResponse(data: YahooFantasyContent): League[] {
  const leagues: League[] = []

  const users = data.fantasy_content?.users
  if (!users) return leagues

  for (const userWrapper of getIndexedValues(users)) {
    const userArray = userWrapper.user
    if (!userArray) continue

    for (const userItem of userArray) {
      if (!('games' in userItem)) continue

      for (const gameItem of getIndexedValues(userItem.games)) {
        if (!('game' in gameItem)) continue

        for (const gameData of gameItem.game) {
          if (!('leagues' in gameData)) continue

          for (const leagueItem of getIndexedValues(gameData.leagues)) {
            if (!('league' in leagueItem)) continue

            const leagueArray = leagueItem.league
            const leagueData = leagueArray[0] as YahooLeagueData | undefined
            if (!leagueData) continue

            // Extract team from the league array (second element contains teams)
            let team: Team | null = null
            for (const item of leagueArray) {
              if (typeof item === 'object' && 'teams' in item) {
                const teamsObj = item.teams as YahooIndexedObject<{
                  team: Array<Array<Record<string, unknown>>>
                }>
                for (const teamWrapper of getIndexedValues(teamsObj)) {
                  // Team data is doubly nested: team[0] is an array of single-key objects
                  const teamFieldsArray = teamWrapper.team[0] as
                    | Array<Record<string, unknown>>
                    | undefined
                  if (!teamFieldsArray) continue

                  // Extract fields from array of objects like [{team_key: "..."}, {team_id: "..."}, {name: "..."}]
                  let teamKey = ''
                  let teamId = ''
                  let teamName = ''
                  for (const field of teamFieldsArray) {
                    if ('team_key' in field) teamKey = field.team_key as string
                    if ('team_id' in field) teamId = field.team_id as string
                    if ('name' in field) teamName = field.name as string
                  }

                  if (teamKey) {
                    team = {
                      team_key: teamKey,
                      team_id: teamId,
                      name: teamName,
                    }
                    break
                  }
                }
                break
              }
            }

            leagues.push({
              league_key: leagueData.league_key,
              name: leagueData.name,
              num_teams: leagueData.num_teams,
              season: leagueData.season,
              team,
            })
          }
        }
      }
    }
  }

  return leagues
}

export async function getUserLeagues(): Promise<League[]> {
  const response = await fetch(
    '/api/yahoo?path=fantasy/v2/users;use_login=1/games;game_keys=nba/leagues/teams?format=json',
    { credentials: 'include' },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch leagues: ${response.status}`)
  }

  const data = (await response.json()) as YahooFantasyContent
  return parseLeaguesFromResponse(data)
}

export type Player = {
  player_key: string
  player_id: string
  name: string
  position: string
  eligible_positions: string[]
  headshot_url: string | null
  status: string | null
  nba_team: string | null
}

type YahooRosterResponse = {
  fantasy_content: {
    team: Array<
      | Array<Record<string, unknown>>
      | {
          roster: Record<string, unknown>
        }
    >
  }
}

function parseRosterFromResponse(data: YahooRosterResponse): Player[] {
  const players: Player[] = []

  const teamArray = data.fantasy_content?.team
  if (!teamArray) return players

  for (const item of teamArray) {
    if (typeof item !== 'object' || Array.isArray(item) || !('roster' in item))
      continue

    // Roster has a "0" key containing "players"
    const rosterData = item.roster as Record<string, unknown>
    const rosterSlot = rosterData['0'] as
      | { players?: YahooIndexedObject<unknown> }
      | undefined
    if (!rosterSlot?.players) continue

    const playersObj = rosterSlot.players as YahooIndexedObject<{
      player: Array<Array<Record<string, unknown>> | Record<string, unknown>>
    }>

    for (const playerWrapper of getIndexedValues(playersObj)) {
      const playerArray = playerWrapper.player
      // First element is an array of single-key objects with player fields
      const playerFieldsArray = playerArray[0] as
        | Array<Record<string, unknown>>
        | undefined
      if (!playerFieldsArray || !Array.isArray(playerFieldsArray)) continue

      // Extract fields from array of objects
      let playerKey = ''
      let playerId = ''
      let playerName = ''
      let displayPosition = ''
      let headshotUrl: string | null = null
      let status: string | null = null
      let nbaTeam: string | null = null
      const eligiblePositions: string[] = []

      for (const field of playerFieldsArray) {
        if ('player_key' in field) playerKey = field.player_key as string
        if ('player_id' in field) playerId = field.player_id as string
        if ('name' in field) {
          const nameObj = field.name as { full?: string }
          playerName = nameObj?.full ?? ''
        }
        if ('display_position' in field)
          displayPosition = field.display_position as string
        if ('headshot' in field) {
          const headshot = field.headshot as { url?: string }
          headshotUrl = headshot?.url ?? null
        }
        if ('status' in field) status = field.status as string
        if ('editorial_team_abbr' in field)
          nbaTeam = field.editorial_team_abbr as string
        if ('eligible_positions' in field) {
          const positions = field.eligible_positions as Array<{
            position: string
          }>
          for (const p of positions) {
            if (p.position) eligiblePositions.push(p.position)
          }
        }
      }

      if (playerKey) {
        players.push({
          player_key: playerKey,
          player_id: playerId,
          name: playerName || 'Unknown',
          position: displayPosition,
          eligible_positions: eligiblePositions,
          headshot_url: headshotUrl,
          status,
          nba_team: nbaTeam,
        })
      }
    }
  }

  return players
}

export async function getRoster(teamKey: string): Promise<Player[]> {
  const response = await fetch(
    `/api/yahoo?path=fantasy/v2/team/${teamKey}/roster?format=json`,
    { credentials: 'include' },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch roster: ${response.status}`)
  }

  const data = (await response.json()) as YahooRosterResponse
  return parseRosterFromResponse(data)
}
