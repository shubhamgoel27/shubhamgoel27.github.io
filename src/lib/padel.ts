// Build-time padel stats from the WPR export + hand-logged friendlies.
// Privacy: other players are only ever counted, never named or shown with ratings.
import wprRaw from "../data/padel/wpr_matches.psv?raw";
import friendliesRaw from "../data/padel/friendlies.psv?raw";
import readmeRaw from "../data/padel/README.md?raw";

const ME = "Shubham Goel";
const PT_OFFSET_H = -7; // export is UTC; the season so far is all PDT

type Kind = "open" | "league" | "tournament";
export interface Match {
  i: number;
  date: string; // YYYY-MM-DD, Pacific
  month: string; // YYYY-MM
  kind: Kind;
  won: boolean;
  before: number;
  after: number;
  score: string; // my side first, e.g. "6-4" or "3-6 6-7"
  gamesFor: number;
  gamesAgainst: number;
  tiebreak: boolean; // a set went 7-6
  close: boolean; // decided by 2 games or fewer, or a tiebreak
  gap: number; // opponents' average rating minus my team's average, before the match
}

const psv = (raw: string) => {
  const [head, ...lines] = raw.trim().split("\n").filter(Boolean);
  const keys = head.split("|");
  return lines.map((l) => Object.fromEntries(l.split("|").map((v, k) => [keys[k], v])));
};

const eventNames = new Map(
  [...readmeRaw.matchAll(/^(\d+) (.+)$/gm)].map((m) => [m[1], m[2]] as const)
);
const kindOf = (id: string): Kind => {
  const n = (eventNames.get(id) ?? "").toLowerCase();
  if (n.includes("league")) return "league";
  if (n.includes("tournament")) return "tournament";
  return "open";
};

const players = (team: string) =>
  team.split("+").map((p) => {
    const [name, r] = p.split(":");
    const [b, a] = r.split(">").map(Number);
    return { name, before: b, after: a };
  });

const toPacific = (utc: string) => {
  const d = new Date(utc + ":00Z");
  d.setUTCHours(d.getUTCHours() + PT_OFFSET_H);
  return d.toISOString().slice(0, 10);
};

export const matches: Match[] = psv(wprRaw).map((r, i) => {
  const a = players(r.team_a), b = players(r.team_b);
  const mineA = a.some((p) => p.name === ME);
  const mine = mineA ? a : b, theirs = mineA ? b : a;
  const me = mine.find((p) => p.name === ME)!;
  const sets = r.sets.split(" ").map((s) => s.split("-").map(Number));
  const own = sets.map(([x, y]) => (mineA ? [x, y] : [y, x]));
  const gf = own.reduce((s, [x]) => s + x, 0), ga = own.reduce((s, [, y]) => s + y, 0);
  const avg = (t: { before: number }[]) => t.reduce((s, p) => s + p.before, 0) / t.length;
  const tiebreak = own.some(([x, y]) => x + y === 13);
  const date = toPacific(r.date_utc);
  return {
    i: i + 1,
    date,
    month: date.slice(0, 7),
    kind: kindOf(r.event_id),
    won: r.winner === (mineA ? "A" : "B"),
    before: me.before,
    after: me.after,
    score: own.map(([x, y]) => `${x}-${y}`).join(" "),
    gamesFor: gf,
    gamesAgainst: ga,
    tiebreak,
    close: tiebreak || own.every(([x, y]) => Math.abs(x - y) <= 2),
    gap: avg(theirs) - avg(mine),
  };
});

// distinct people, counted only
const partnerSet = new Set<string>(), oppSet = new Set<string>();
for (const r of psv(wprRaw)) {
  const a = players(r.team_a), b = players(r.team_b);
  const mineA = a.some((p) => p.name === ME);
  (mineA ? a : b).filter((p) => p.name !== ME).forEach((p) => partnerSet.add(p.name));
  (mineA ? b : a).forEach((p) => oppSet.add(p.name));
}

const record = (ms: Match[]) => {
  const w = ms.filter((m) => m.won).length;
  return { w, l: ms.length - w, pct: ms.length ? Math.round((100 * w) / ms.length) : 0 };
};

let streak = 0, best = 0;
for (const m of matches) { streak = m.won ? streak + 1 : 0; best = Math.max(best, streak); }

const upsets = matches.filter((m) => m.won && m.gap > 0).sort((x, y) => y.gap - x.gap);

export const summary = {
  start: matches[0].before,
  now: matches[matches.length - 1].after,
  peak: Math.max(...matches.map((m) => m.after)),
  first: matches[0].date,
  last: matches[matches.length - 1].date,
  played: matches.length,
  ...record(matches),
  days: new Set(matches.map((m) => m.date)).size,
  partners: partnerSet.size,
  opponents: oppSet.size,
  bestStreak: best,
  gamesPct: Math.round((100 * matches.reduce((s, m) => s + m.gamesFor, 0)) /
    matches.reduce((s, m) => s + m.gamesFor + m.gamesAgainst, 0)),
  close: record(matches.filter((m) => m.close)),
  tiebreaks: record(matches.filter((m) => m.tiebreak)),
  biggestUpset: upsets[0] ?? null,
  pulled: (readmeRaw.match(/pulled (\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? "",
};

export const months = [...new Set(matches.map((m) => m.month))].map((month) => {
  const ms = matches.filter((m) => m.month === month);
  return { month, played: ms.length, ...record(ms), from: ms[0].before, to: ms[ms.length - 1].after, days: new Set(ms.map((m) => m.date)).size };
});

export const byKind = (["open", "league", "tournament"] as Kind[]).map((kind) => ({
  kind,
  label: { open: "Open play", league: "League", tournament: "Tournaments" }[kind],
  ...record(matches.filter((m) => m.kind === kind)),
  played: matches.filter((m) => m.kind === kind).length,
}));

// friendlies: one row per set, my team's games first
const fr = psv(friendliesRaw);
export const friendlies = {
  sets: fr.length,
  ...(() => {
    const w = fr.filter((r) => Number(r.games_for) > Number(r.games_against)).length;
    return { w, l: fr.length - w };
  })(),
  days: new Set(fr.map((r) => r.date)).size,
  notes: fr.map((r) => r.note).filter(Boolean),
};
