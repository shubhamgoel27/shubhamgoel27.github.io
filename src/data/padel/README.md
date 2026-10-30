# WPR match export

Source: World Padel Rating app (api.redpadel.com GraphQL `getMatches`, my user id, no status filter), pulled 2026-10-29.
The app UI shows only 10 of these 105 matches.

`wpr_matches.psv`: pipe-separated. Players are `Name:ratingBefore>ratingAfter` (WPR-s social rating), joined by `+`.
Sets are teamA-teamB. `winner` is A or B. Dates are UTC (Pacific = UTC-7).

event_id:
0 Beginner Open Play 0-1.49 (Sunnyvale)
1 High Beginner Open Play 1.5-3.49 (Sunnyvale)
2 High Beginner Open Play 1.5-3.49 (Sunnyvale) (Copy)
3 San Jose Tournament (July 11, 2026)
4 2026 Bay Padel League Season 2 (SOUTH BAY)
5 High Beginner Open Play 1.5-3.49 (SV) [8.25]
6 High Beginner Open Play 1.5-3.49 (SV) [9/1]
7 Bay Padel Tournament - September 20th - Treasure Island
8 High Beginner Open Play 1.5-3.49 (SJ)
9 High Beginner Open Play 1.5-3.49 (Sunnyvale) 10/13 8PM
10 INTERMEDIATE Open Play 3.5-5.99 [10/15] (Sunnyvale)
11 Bay Padel Tournament - San Jose (Oct 18, D3 High Beginner, with Chirag: won)
12 INTERMEDIATE Open Play 3.5-5.99 San Jose
13 High Beginner Open Play 1.5-3.49 (Sunnyvale) 10/27
14 INTERMEDIATE Open Play 3.5-5.99 (Sunnyvale) [10/29]

# Friendlies (not on WPR)

`friendlies.psv`: one row per set, logged by hand. Scores are from my team's side (games_for = my team).
Kept separate from the WPR export on purpose: friendlies have no rating changes and are not in WPR's model fit.
`note` holds anything useful about how the set went (leads lost, comebacks, conditions).
