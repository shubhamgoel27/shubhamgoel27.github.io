---
title: "I got two parking tickets, so I trained a VLM"
description: "A week in San Francisco, two parking tickets, and a small vision-language model I taught to read stacked parking signs and tell you if you can legally park."
pubDate: 2026-06-16
updatedDate: 2026-07-08
tags: ["machine learning", "multimodal", "vision-language models", "side projects"]
coverImage: ./curbcheck-cover.png
---

In April I drove up from San Jose for a week in San Francisco. I came home with good memories and two parking tickets. Same reason both times: I stood in front of a pole with four signs on it, read all four, and still couldn't tell you whether I was allowed to leave my car there.

You know the pole. Two-hour limit. Except with an Area S permit. Except it's also street cleaning on Tuesday mornings. Oh, and tow-away during the evening rush. Every sign makes sense on its own. Stack four of them and you've got a little logic puzzle with a clock in it, and my brain, mid-errand and already late, just didn't want to. Twice. $160 of tuition.

What really got me is that everything you need is printed right there on the metal. It's reading, plus a few rules, plus knowing what time it is. That's a very machine-shaped problem, so I asked the obvious question:

> Can a small, cheap, could-run-on-a-phone vision-language model do the thing my brain wouldn't?

The off-the-shelf one can't. Turns out you can teach it, though. I called it **curbcheck**.

## Read first, do the logic separately

The lazy way to build this is to hand a model the photo, ask "can I park here?", and trust whatever sentence comes back. I didn't want that. A one-shot verdict hides its mistakes inside confident-sounding prose. And honestly, I wanted to learn to read these signs myself, not outsource it forever.

So curbcheck does it in two steps:

```
photo  ->  VLM reads each sign into JSON  ->  deterministic resolver  ->  verdict + reason
```

The model only does the seeing. It reads the pole into structured fields: what kind of restriction, which days, which hours, time limits, permit area, even things like "2nd and 4th Tuesday of the month." Then a small resolver, plain Python with no model anywhere near it, takes those fields plus the current time and gives you the verdict. You see both halves, so when the model misreads something, you can actually see it.

The nice part is that the resolver never gets the logic wrong, no matter how many signs are on the pole. Every hard case boils down to one question: did the model read the pole right?

## Making the data

There's no dataset of SF parking poles with ground-truth rules, so I made one.

Half of it is synthetic. I wrote a renderer that draws California-style sign plates straight from the public Caltrans specs,<span class="sn">The R26 no-parking, R30 time-limit, and R32 street-cleaning families, if you're into that sort of thing.</span> stacks one to four of them on a pole, and saves every image with exact labels. Exact because it picks the rules first and draws them second. To keep the combinations realistic instead of random, I seeded them from SFMTA's public inventory of 144,333 real street signs.

![A synthetic rendered sign stack next to a real, faded SF parking sign](/blog/curbcheck/hero.png)
*Left: a clean synthetic render. Right: a real one, faded and tilted and shot from a moving car. The gap between those two is what the rest of this post is about.*

The other half is real: DPW street-space permit photos and 311 reports from SF's open data, which turn out to be full of close-up sign shots. I had Claude Opus label them as a teacher and checked a chunk by hand. Final mix: roughly 77% synthetic, 23% real.

## The 3B, and how it did

The student is **Qwen2.5-VL-3B**, fine-tuned with QLoRA on a rented A100.<span class="sn">Rank 16, language layers only. The vision encoder stayed frozen.</span> Small and cheap, the kind of model that could live on a phone someday. Remember that frozen vision encoder, it comes back later.

On the synthetic benchmark it did well. Almost suspiciously well.

![Bar chart comparing the base model and the tuned model on read accuracy and reasoning](/blog/curbcheck/results.png)
*Read F1 and reasoning accuracy, base Qwen2.5-VL-3B versus the QLoRA-tuned version.*

Out of the box, Qwen2.5-VL-3B scores **0.16** on "can I park here right now," which is <mark>below the 0.25 you'd get by guessing</mark> between the four verdicts. One QLoRA run takes it to **0.82 reasoning** and **0.98 read accuracy**.

And it drops off with the number of signs, exactly like my tickets would predict:

| Signs on the pole | Tuned reasoning accuracy |
|---|:---:|
| 1 sign | 0.95 |
| 2 signs | 0.80 |
| 3 signs | 0.67 |
| 4 signs | 0.56 |

That last row is the pole that got me. The model's better at it than I was.

## Then the real world

Synthetic numbers are easy to love. Real photos are where it got humbling.

![A real, slightly tilted SF no-stopping sign photographed on the street](/blog/curbcheck/real-sign-1.jpg)
*A real pole from the test set. Faded, shot at an angle, outdoors, and a lot harder than a clean render.*

On held-out real SF photos, reading was rough:

| Metric (real photos) | base | tuned |
|---|:---:|:---:|
| Read F1 | 0.04 | **0.34** |
| Pipeline reasoning | 0.78 | **0.89** |

The resolver really earns its keep here. Pipeline reasoning holds at 0.89 even with reading stuck at 0.34, because a partial read still resolves correctly more often than not. But the reading itself was bad, and I couldn't move it. I doubled the real data, added human-verified labels, and taught the renderer to fade, cover, and tilt its signs like the real ones. About a week of that. Real-photo reading went from 0.33 to 0.34.

When a pile of new data barely moves a number, the problem usually isn't the data. My bet was capacity, specifically that frozen vision encoder, which never got a chance to adapt to sun-bleached Mission Street poles. So I unfroze it, pulled in parking signs from other cities,<span class="sn">Oakland, Chicago, and about a dozen more.</span> and swapped the single-pass labels for a 3-vote consensus.

| Metric (real photos) | base | first tune | vision unfrozen + more data |
|---|:---:|:---:|:---:|
| Read F1 | 0.04 | 0.34 | 0.33 |
| Reasoning (pipeline) | 0.78 | 0.89 | 0.90 |
| Reasoning (end to end) | 0.09 | 0.41 | 0.82 |

Reading still didn't budge. But end-to-end reasoning doubled, 0.41 to 0.82. The extra data and cleaner labels didn't teach the model to read better. They taught it to reason better about what it did read, and to stop inventing restrictions on simple poles. Not what I was going for, but I'll take it.

I had one more idea for reading: bolt on a small OCR model to feed the VLM text hints, plus a contrast trick to rescue faded signs. It looked great on the handful of images I'd hand-picked, so I ran it on the whole test set. It made things worse. The OCR hints confused the model on clean signs it already read fine, and the contrast trick did basically nothing on average.

## Most of the gap was my ruler

At this point I'd pretty much made peace with "real-world reading is just hard." Then I finally looked properly at the eval itself, and a lot of the "model can't read" story turned out to be me measuring wrong.

Start with the scorer. Almost half the real set, 231 of 500 photos, is downed or missing poles with nothing to read, where the right answer is an empty list. My scorer was counting that correct "nothing" as a zero instead of a perfect score. So half my benchmark was punishing the model for getting it right. Fixing it changed the picture:

| metric (real photos) | base | v5 (3B) |
|---|:---:|:---:|
| Read F1, sign-bearing photos | 0.08 | 0.62 |
| Abstains correctly on no-sign photos | 0.57 | 0.83 |

So the 3B was reading real poles at about 0.62, not the 0.33 I'd been stressing over. Decent on one and two-sign poles, weak on the cluttered four-sign ones.

That made the capacity idea worth another shot, so I swapped in a **7B** student trained on the full cross-city corpus.<span class="sn">17 cities by then, all consensus-labeled.</span> It read clean single-sign poles perfectly and nudged the real reads up. But when I split the score by number of signs, the dense poles came back at roughly zero. For an afternoon I believed it and quietly mourned the bigger model. Then I read the raw outputs. The 7B was reading those poles just fine and then simply not stopping. It'd finish the JSON and keep going instead of emitting a stop token. Cap the length low and you get truncated, invalid JSON. Cap it high and each read takes fifty seconds. The 3B never did this.

The fix wasn't a retrain. It was a stopping rule in the eval harness that ends generation the moment the JSON closes. Dense-pole reads dropped to a few seconds, and the full 500-photo eval finally ran end to end with nothing skipped.

That left one weird pile: 45 single-sign photos, the easy case, all scoring exactly zero. So I went through every one, with three vision models re-reading each photo and voting. Here's who was actually wrong:

| who was actually wrong | count |
|---|:---:|
| the model | 14 |
| the teacher's gold labels | 12 |
| nobody (two valid names for one sign) | 7 |
| the sign itself (graffiti, cropped, too far away) | 12 |

<mark>Only about a third were the model.</mark> The Opus teacher had written "12 NOON TO 2PM" as midnight to 2am, labeled a Monday sign as Wednesday, and left times blank on signs where they're perfectly readable. About one gold label in eight was broken. I'd been grading the student against the teacher's mistakes.

The audit also turned up something worse, in the half I'd been calling the reliable one. A pole whose only sign says "TOW-AWAY, NO PARKING ANY TIME" fell through every branch of the resolver and came back as *you can park here*. At a tow-away zone. The eval even had that baked in as the correct answer, so no metric was ever going to catch it. It's fixed now, with regression tests.

After cleaning up the labels, the naming ties, and the resolver, here's where it actually lands:

| metric (real photos) | v5 (3B) | v6 (7B) |
|---|:---:|:---:|
| Read F1, sign-bearing poles | 0.62 | **0.83** |
| Read F1, single-sign poles | | **0.88** |
| Pipeline reasoning | 0.90 | 0.89 |

<mark>Something like 40% of what I'd been calling a model gap was measurement.</mark> I went in thinking the hard part would be the model. A good chunk of it was me, grading against a broken scorer and a teacher that couldn't reliably tell noon from midnight.

## Try it

I wrapped the tuned model in a small demo. Upload a photo of an SF sign pole, pick a day and time, and it shows you what each sign says and whether you can park.

<div style="position:relative;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--paper-sunk);margin:1.75rem 0;">
  <iframe src="https://build-small-hackathon-curbcheck.hf.space" title="curbcheck live demo" loading="lazy" style="width:100%;height:640px;border:0;display:block;"></iframe>
</div>

*Give it a few seconds to wake up, it runs on free ZeroGPU and naps when idle. If it's asleep, the [full Space](https://huggingface.co/spaces/build-small-hackathon/curbcheck) is here.*

- Demo: [the curbcheck Space](https://huggingface.co/spaces/build-small-hackathon/curbcheck)
- Model (the v5 adapter): [shubhamgoel27/curbcheck-qwen25vl3b-v5-lora](https://huggingface.co/shubhamgoel27/curbcheck-qwen25vl3b-v5-lora)
- Code, benchmark, and the full results: [github.com/shubhamgoel27/curbcheck](https://github.com/shubhamgoel27/curbcheck)

It isn't solved. Reading real-world signs is still the open problem, and honestly that's more fun than if it had worked on the first try. But there's a small model now that handles the pole that beat me, and I know what I'd try next.

Still a little annoyed about those tickets. At least I got a blog post out of them.
