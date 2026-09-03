---
title: "I got two parking tickets, so I trained a VLM"
description: "A week in San Francisco, two parking tickets, and a small vision-language model I taught to read stacked parking signs and tell you if you can legally park."
pubDate: 2026-06-16
updatedDate: 2026-07-08
tags: ["machine learning", "multimodal", "vision-language models", "side projects"]
coverImage: ./curbcheck-cover.png
---

In April I drove up from San Jose and spent a week in San Francisco. I came home with good memories and two parking tickets, both for the same reason. I had stood in front of a pole holding four signs, read all four, and still couldn't work out whether I was allowed to leave my car there.

You know the pole. Two-hour limit. Except with an Area S permit. Except it is also a street-cleaning zone on Tuesday mornings. Also tow-away during the evening rush. Each sign is fine on its own. Stack them and you get a small logic puzzle with a clock in it, and my brain, mid-errand and already late, declined to solve it. Twice. Call it $160 of tuition.

The annoying part is that everything you need is printed right there on the metal. It is perception, plus a handful of rules, plus knowing what time it is. That is a very machine-shaped problem, so I tried the obvious thing:

> Can a small, cheap, could-run-on-a-phone vision-language model do the thing my brain wouldn't?

The off-the-shelf one can't. But it turns out you can teach it. The project is called **curbcheck**.

## Read first, do the logic separately

The lazy build is to hand the model a photo, ask "can I park here," and trust the sentence that comes back. I didn't want that. An end-to-end verdict hides its mistakes inside confident prose, and I wanted to actually learn to read these signs myself rather than outsource it forever.

So curbcheck does it in two steps:

```
photo  ->  VLM reads each sign into JSON  ->  deterministic resolver  ->  verdict + reason
```

The vision-language model only handles perception. It reads the pole into structured fields: kind of restriction, days, hours, time limits, permit area, even "2nd and 4th Tuesday of the month." Then a small resolver, plain Python with no model in it, takes those fields plus the current time and returns the verdict. You see both halves, so a misread shows up instead of hiding.

The useful thing about the split is that the resolver never fumbles the logic, however many signs are on the pole. Every hard case then reduces to a single question: did the model read the pole correctly?

## Making the data

There is no dataset of SF parking poles with ground-truth rules, so I built one.

Half of it is synthetic. A renderer draws CA-style sign plates from the public Caltrans specs (the R26 no-parking, R30 time-limit, and R32 street-cleaning families), stacks one to four of them on a pole, and ships each image with exact labels, because it generates the rules first and draws them second. To keep the rule mixes realistic instead of uniform-random, I seeded them from SFMTA's public inventory of 144,333 real street signs.

![A synthetic rendered sign stack next to a real, faded SF parking sign](/blog/curbcheck/hero.png)
*Left: a clean synthetic render. Right: a real one, faded and tilted and shot from a moving car. The gap between those two is what the rest of this is about.*

The other half is real, from SF's open data: DPW street-space permit photos and 311 reports, both full of close-up sign shots. I had Claude Opus label them as a teacher and hand-checked a chunk of that. The final mix is about 77% synthetic, 23% real.

## The 3B, and how it did

The student is **Qwen2.5-VL-3B**, fine-tuned with QLoRA (rank 16) on the language layers, vision encoder frozen, on a rented A100. Small and cheap, the kind of model that could plausibly live on a phone one day. Hold onto that frozen vision encoder for a minute.

On the synthetic benchmark it did well, almost suspiciously so.

![Bar chart comparing the base model and the tuned model on read accuracy and reasoning](/blog/curbcheck/results.png)
*Read F1 and reasoning accuracy, base Qwen2.5-VL-3B versus the QLoRA-tuned version.*

A stock Qwen2.5-VL-3B scores **0.16** on "can I park here right now," which is below the 0.25 you would get guessing among the four verdicts. One QLoRA run takes it to **0.82 reasoning** and **0.98 read accuracy**.

And it falls off with the number of signs, exactly the way the ticket story predicted:

| Signs on the pole | Tuned reasoning accuracy |
|---|:---:|
| 1 sign | 0.95 |
| 2 signs | 0.80 |
| 3 signs | 0.67 |
| 4 signs | 0.56 |

The bottom row is the pole that cost me the tickets. The model is better at it than I was.

## Then the real world

Synthetic numbers are easy to like. Real photos are where it got humbling.

![A real, slightly tilted SF no-stopping sign photographed on the street](/blog/curbcheck/real-sign-1.jpg)
*A real pole from the test set. Faded, oblique, shot outdoors, and much harder than a clean render.*

On held-out real SF photos, reading was hard:

| Metric (real photos) | base | tuned |
|---|:---:|:---:|
| Read F1 | 0.04 | **0.34** |
| Pipeline reasoning | 0.78 | **0.89** |

The resolver earns its keep here. Pipeline reasoning holds at 0.89 even with reading stuck at 0.34, because partial reads still resolve correctly more often than not. But the reading itself was bad, and I could not move it. I doubled the real data, added human-verified labels, and taught the renderer to fade, occlude, and skew its signs. Real-photo reading went from 0.33 to 0.34.

If a pile of new data barely moves a number, the bottleneck usually isn't data. I figured it was capacity, and specifically that frozen vision encoder, which never got to adapt to sun-bleached Mission Street poles. So I unfroze it, pulled in parking signs from other cities (Oakland, Chicago, a dozen more), and swapped the single-pass labels for a 3-vote consensus.

| Metric (real photos) | base | first tune | vision unfrozen + more data |
|---|:---:|:---:|:---:|
| Read F1 | 0.04 | 0.34 | 0.33 |
| Reasoning (pipeline) | 0.78 | 0.89 | 0.90 |
| Reasoning (end to end) | 0.09 | 0.41 | 0.82 |

Reading still didn't move. But end-to-end reasoning doubled, 0.41 to 0.82. The diverse data and cleaner labels hadn't taught the model to read better, they had taught it to reason better about what it did read and to stop over-calling restrictions on simple poles. Not the thing I set out to fix, but I'll take it.

I had one more idea for reading: a small dedicated OCR model to feed the VLM text hints, and a contrast-normalization pass to rescue faded signs. It looked good on a handful of images I had picked by hand, so I ran it across the whole test set. It made things worse. The OCR hints confused the model on the clean signs it already read fine, and the contrast trick averaged out to nothing.

## Most of the gap was my ruler

By now I was fairly sure real-world reading was just hard. Then I went and looked at the eval itself, and a lot of the "the model can't read" story turned out to be me measuring wrong.

Start with the scorer. Half the real set, 231 of 500 photos, is downed or missing poles with no readable sign, where the correct answer is to read nothing. My read-F1 scorer was counting that correct "nothing" as a zero instead of a perfect score, so almost half the benchmark was punishing the model for abstaining correctly. Fixing it changed the picture:

| metric (real photos) | base | v5 (3B) |
|---|:---:|:---:|
| Read F1, sign-bearing photos | 0.08 | 0.62 |
| Abstains correctly on no-sign photos | 0.57 | 0.83 |

So the 3B was reading real sign-bearing poles at about 0.62, not the 0.33 I had been agonizing over. Decent on one and two-sign poles, weak on cluttered four-sign ones.

That made the capacity idea worth another look, so I swapped the 3B for a **7B** student trained on the full cross-city corpus (17 cities by now, consensus-labeled). It read clean single-sign poles perfectly and nudged the real sign-bearing reads up. But when I split the score by how many signs were on the pole, dense poles came back at roughly zero. That looked like a catastrophe until I read the raw outputs. The 7B was reading those poles fine and then never stopping: it emitted the JSON and kept generating instead of producing an end-of-sequence token. Capped low, the reads truncated into invalid JSON. Capped high, they took fifty seconds each. The 3B never did this.

The fix wasn't a retrain, it was a stopping rule in the eval harness that ends generation the moment the JSON closes. Dense-pole reads dropped to a few seconds, and the full 500-photo eval finally ran end to end with nothing skipped.

That left one strange pile: 45 single-sign photos, the easy case, scoring exactly zero. So I read every one of them, with three vision models re-reading each photo and adjudicating. Where the errors actually came from:

| who was actually wrong | count |
|---|:---:|
| the model | 14 |
| the teacher's gold labels | 12 |
| nobody (two valid names for one sign) | 7 |
| the sign itself (graffiti, cropped, too far away) | 12 |

Only about a third were the model. The Opus teacher had written "12 NOON TO 2PM" as midnight to 2am, labeled a Monday sign as Wednesday, and left the times blank on signs where they are perfectly legible. Roughly one gold label in eight was malformed, which means I had been grading the student against the teacher's mistakes.

The audit also turned up something worse, in the resolver I had been calling the reliable half. A pole whose only sign reads "TOW-AWAY, NO PARKING ANY TIME" fell through every branch of the verdict logic and came back as you can park here, at a tow-away zone. The eval had even baked that in as the correct answer, so no metric would ever have caught it. It is fixed now, with regression tests.

After cleaning up the labels, the naming ties, and the resolver, here is where it lands:

| metric (real photos) | v5 (3B) | v6 (7B) |
|---|:---:|:---:|
| Read F1, sign-bearing poles | 0.62 | **0.83** |
| Read F1, single-sign poles | | **0.88** |
| Pipeline reasoning | 0.90 | 0.89 |

Something like 40% of what I had been calling a model gap was measurement. I went in expecting the interesting problem to be the model. Most of it was the ruler.

## Try it

I wrapped the tuned model in a small demo. Upload a photo of an SF sign pole, pick a day and time, and it shows you both what each sign says and whether you can park.

<div style="position:relative;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--paper-sunk);margin:1.75rem 0;">
  <iframe src="https://build-small-hackathon-curbcheck.hf.space" title="curbcheck live demo" loading="lazy" style="width:100%;height:640px;border:0;display:block;"></iframe>
</div>

*Give it a few seconds to wake up, it runs on free ZeroGPU and naps when idle. If it's asleep, the [full Space](https://huggingface.co/spaces/build-small-hackathon/curbcheck) is here.*

- Demo: [the curbcheck Space](https://huggingface.co/spaces/build-small-hackathon/curbcheck)
- Model (the v5 adapter): [shubhamgoel27/curbcheck-qwen25vl3b-v5-lora](https://huggingface.co/shubhamgoel27/curbcheck-qwen25vl3b-v5-lora)
- Code, benchmark, and the full results: [github.com/shubhamgoel27/curbcheck](https://github.com/shubhamgoel27/curbcheck)

It isn't solved. Real-world reading is still the open problem, and that's more interesting to me than if it had worked on the first try. But there is a small model now that handles the pole that beat me, and a clear idea of what to try next.

Still a little annoyed about those tickets. At least they were tax-deductible as research.
