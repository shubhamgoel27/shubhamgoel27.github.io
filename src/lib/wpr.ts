// Reverse-engineered WPR-s update rule, shared by the calculator and the blog widgets.
// Fitted on ~7,400 rating updates (300+ players with full histories); details in
// ~/work/padel-ai/MODEL.md (v7, site fit). change = K × top × setsScale × busy × (actual − expected).
// expected comes from "your gap": your team average, pulled toward your own rating by lam (70% you, 30% partner).
// busy: each match you played in the last 14 days, beyond 4, makes the step about 3% smaller (wf).
export const P = { K0up: 1.255, K0down: 0.789, s: 1.32, c: 4.889, kmin: 0.3, a: 0.182, b3: 0.662, kh: 0.138, r0: 7.221, lam: 0.42, wf: -0.028 };

/** a typical experienced player's matches in the last 14 days; the widgets and the calculator default to it */
export const FREQ = 8;

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** your gap vs the opponents' average: the team average, moved toward your own rating */
export const myGap = (me: number, partner: number, op: number) => {
  const us = (me + partner) / 2;
  return us + P.lam * (me - us) - op;
};

/** games share WPR expects from you, given your gap */
export const expectedShare = (gap: number) => sig(gap / P.s);

/** the core rule; win can be 0.5 for a set that isn't decided yet */
export function change(o: { me: number; gap: number; n: number; win: number; share: number; nsets?: number; freq?: number }) {
  const expected = expectedShare(o.gap);
  const surprise = P.a * o.win + (1 - P.a) * o.share - expected;
  const K = P.kmin + ((surprise > 0 ? P.K0up : P.K0down) - P.kmin) * Math.exp(-o.n / P.c);
  const top = 1 + P.kh * Math.max(0, o.me - P.r0);
  const busy = Math.max(0.2, 1 + P.wf * ((o.freq ?? FREQ) - 4));
  return K * top * (1 + P.b3 * ((o.nsets ?? 1) - 1)) * busy * surprise;
}

/** a full match from its set scores */
export function predict(me: number, partner: number, op: number, n: number, sets: [number, number][], freq = FREQ) {
  const gf = sets.reduce((s, [f]) => s + f, 0), ga = sets.reduce((s, [, a]) => s + a, 0);
  const win = sets.filter(([f, a]) => f > a).length * 2 > sets.length ? 1 : 0;
  const share = gf + ga ? gf / (gf + ga) : 0.5;
  const gap = myGap(me, partner, op);
  return { delta: change({ me, gap, n, win, share, nsets: sets.length, freq }), expected: expectedShare(gap), win, share };
}

// tiny changes get a third decimal so a −0.004 doesn't read as "−0.00"
export const fmt = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(Math.abs(x) < 0.01 && x !== 0 ? 3 : 2);

export const ONESET: [number, number][] = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5],[7,6],[6,7],[5,7],[4,6],[3,6],[2,6],[1,6],[0,6]];
