// Reverse-engineered WPR-s update rule, shared by the calculator and the blog widgets.
// Fitted on 735 rating updates (players rated 0.4-6.7); details in ~/work/padel-ai/MODEL.md.
// change = K × top × setsScale × (actual − expected)
export const P = { K0up: 1.133, K0down: 0.617, s: 1.746, c: 5.2, kmin: 0.262, a: 0.184, b3: 1.223, kh: 0.705, r0: 5.776 };

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** games share your team needs for an expected result, given the team-average gap */
export const expectedShare = (gap: number) => sig(gap / P.s);

/** the core rule; win can be 0.5 for a set that isn't decided yet */
export function change(o: { me: number; gap: number; n: number; win: number; share: number; nsets?: number }) {
  const expected = expectedShare(o.gap);
  const surprise = P.a * o.win + (1 - P.a) * o.share - expected;
  const K = P.kmin + ((surprise > 0 ? P.K0up : P.K0down) - P.kmin) * Math.exp(-o.n / P.c);
  const top = 1 + P.kh * Math.max(0, o.me - P.r0);
  return K * top * (1 + P.b3 * ((o.nsets ?? 1) - 1)) * surprise;
}

/** a full match from its set scores */
export function predict(me: number, us: number, op: number, n: number, sets: [number, number][]) {
  const gf = sets.reduce((s, [f]) => s + f, 0), ga = sets.reduce((s, [, a]) => s + a, 0);
  const win = sets.filter(([f, a]) => f > a).length * 2 > sets.length ? 1 : 0;
  const share = gf + ga ? gf / (gf + ga) : 0.5;
  return { delta: change({ me, gap: us - op, n, win, share, nsets: sets.length }), expected: expectedShare(us - op), win, share };
}

// tiny changes get a third decimal so a −0.004 doesn't read as "−0.00"
export const fmt = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(Math.abs(x) < 0.01 && x !== 0 ? 3 : 2);

export const ONESET: [number, number][] = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5],[7,6],[6,7],[5,7],[4,6],[3,6],[2,6],[1,6],[0,6]];
