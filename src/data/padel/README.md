# WPR match export

Source: World Padel Rating app (api.redpadel.com GraphQL `getMatches`, my user id, no status filter), pulled 2026-11-13.
The app UI shows only 10 of these 125 matches.

`wpr_matches.psv`: pipe-separated. Players are `Name:ratingBefore>ratingAfter` (WPR-s social rating), joined by `+`.
Sets are teamA-teamB. `winner` is A or B.
Format `POINTS` (Mexicano, from Nov 11 2026) has no sets: `sets` holds the round's points, e.g. 16-8 out of 24.
A level points round (12-12) has winner `D`: WPR names a winner for it but rates it as a draw (half a win).
WPR re-rates past matches now and then; `merge.py --refresh` copies its current ratings onto stored rows (last done 2026-11-12).
Dates are UTC; the site converts them to Pacific time (UTC-7 in summer, UTC-8 in winter).

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
15 USA PADEL 500 BAY PADEL SAN FRANCISCO
16 INTERMEDIATE Open Play 3.5-5.99 (Sunnyvale) [11/5]
17 Bay Padel Mexicano - Intermediate (San Jose)
18 Bay Padel Mexicano - Intermediate 3.5-5.99 (Sunnyvale) 11/12

# Friendlies (not on WPR)

`friendlies.psv`: one row per set, logged by hand. Scores are from my team's side (games_for = my team).
Kept separate from the WPR export on purpose: friendlies have no rating changes and are not in WPR's model fit.
`note` holds anything useful about how the set went (leads lost, comebacks, conditions).

`wpr_competition.psv`: my competition (verified) matches, same columns as `wpr_matches.psv`. These move the
competition WPR, a separate rating chain from WPR-s, so they are kept apart. First entries: USA Padel 500, Oct 31.
