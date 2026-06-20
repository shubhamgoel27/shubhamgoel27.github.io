---
title: "I got two parking tickets, so I trained a VLM"
description: "A week in San Francisco, two parking tickets, and a small vision-language model I taught to read stacked parking signs and tell you if you can legally park."
pubDate: 2026-06-16
tags: ["machine learning", "multimodal", "vision-language models", "side projects"]
coverImage: ./curbcheck-cover.png
---

In April I drove up from San Jose and spent a week in San Francisco. I came back with good memories and two parking tickets. Both for the same reason: I stood in front of a pole holding four signs, read all four, and still could not work out whether I was allowed to leave my car there.

You know the pole. A 2-hour limit. *Except* with an Area S permit. *Except* it is also a street-cleaning zone on Tuesday mornings. *Also* tow-away during evening rush. Each sign is perfectly legible on its own. Stacked together they form a little logic puzzle with a time variable, and my brain, mid-errand and already late, refused to solve it. Twice. That is about $160 of tuition.

The maddening part is that every fact you need is printed right there on the metal. It is pure perception, plus rule-logic, plus a clock. Which is a very machine-shaped problem. So I asked the obvious question:

> Can a small, cheap, runs-on-a-phone vision-language model do the thing my brain failed to do?

The off-the-shelf one cannot. But you can teach it. I called the project **curbcheck**, and this is how it went.

## The trap is the stack, not the sign

A single sign is easy. Modern VLMs read "2 HOUR PARKING 9AM TO 6PM" without breaking a sweat. The difficulty is combinatorial: the moment you stack three or four restrictions on one pole, the model has to read all of them correctly *and* combine them under a specific day and time. Miss one faded sign at the bottom and the whole verdict flips from "fine" to "your car is on a flatbed."

So the interesting unit is never one sign. It is the pole.

## Read, then reason

The lazy design is to show the model a photo and ask "can I park here?" and trust whatever sentence comes out. I did not want that, for two reasons. First, an end-to-end verdict hides its mistakes inside confident prose. Second, I wanted to actually learn the signs myself, not outsource my brain forever.

So curbcheck splits the job in two:

```
photo  ->  VLM reads each sign to JSON  ->  deterministic resolver  ->  verdict + reason
```

The vision-language model only does **perception**. It reads the pole into structured rules: kind, days, hours, time limits, permit area, even "2nd and 4th Tuesday of the month." Then a tiny **deterministic resolver** (plain Python, no model in the loop) takes those rules plus the current time and returns the verdict. Both halves are shown to you, so a misread is visible instead of buried.

That split turns out to be the whole ballgame. The resolver never fumbles the logic, no matter how many signs are on the pole. All the difficulty collapses onto one question: did the model read the pole correctly?

## Making data out of thin air

There is no dataset of "SF parking poles with ground-truth rules." So I made one.

The synthetic half is a renderer that draws CA-style sign plates from public Caltrans sign specs (the R26 no-parking, R30 time-limit, and R32 street-cleaning families), stacks one to four of them on a pole, and ships every pixel with exact ground truth, because I generated the rules first and drew them second. To keep the rule distributions realistic rather than uniform-random, I seeded them from SFMTA's public inventory of 144,333 actual street signs.

![A synthetic rendered sign stack next to a real, faded SF parking sign](/blog/curbcheck/hero.png)
*Left: a clean synthetic render. Right: the real world, where signs are faded, tilted, sticker-covered, and shot from a moving car. The gap between these two is the entire story of this project.*

The real half came from SF's open data: DPW street-space permit photos and 311 reports, which are full of close-up sign photos. I had a frontier model (Claude Opus) label them as a teacher, then verified a chunk by hand. The final mix is roughly 77% synthetic, 23% real.

## The student

The model is **Qwen2.5-VL-3B**, fine-tuned with QLoRA (rank 16) on the language layers only, with the vision encoder frozen, trained on a rented A100. Small, cheap, and the kind of thing that could plausibly run on a phone someday. Remember that frozen vision encoder. It comes back to bite me later.

## Does it work?

On the synthetic benchmark, embarrassingly well.

![Bar chart comparing the base model and the tuned model on read accuracy and reasoning](/blog/curbcheck/results.png)
*Read F1 and reasoning accuracy, base Qwen2.5-VL-3B versus the QLoRA-tuned version.*

A stock Qwen2.5-VL-3B scores **0.16** on "can I park here right now," which is *below* the 0.25 you would get by guessing among four verdicts at random. One QLoRA run takes it to **0.82 reasoning** and **0.98 read accuracy**.

And it scales exactly the way the parking-ticket story predicts, with the number of signs on the pole:

| Signs on the pole | Tuned reasoning accuracy |
|---|:---:|
| 1 sign | 0.95 |
| 2 signs | 0.80 |
| 3 signs | 0.67 |
| 4 signs | 0.56 |

That last row is the exact pole that cost me two tickets. The model is now meaningfully better at it than I was.

## The honest part

Here is where I have to be a grown-up about it. Synthetic numbers are easy to fall in love with, and the real world is where projects go to be humbled.

![A real, slightly tilted SF no-stopping sign photographed on the street](/blog/curbcheck/real-sign-1.jpg)
*A real pole from the test set. Faded, oblique, shot outdoors. Much harder than a clean render.*

On held-out real SF photos, reading is genuinely hard:

| Metric (real photos) | base | tuned |
|---|:---:|:---:|
| Read F1 | 0.04 | **0.34** |
| Pipeline reasoning | 0.78 | **0.89** |

Two things jump out. The good: the deterministic resolver keeps pipeline reasoning at **0.89** even when reading is stuck at 0.34, which is exactly the payoff of the read-then-reason split. Partial reads still resolve correctly more often than not.

The humbling: I threw everything at the reading gap. I doubled the real training data, added human-verified labels, and augmented the renderer with fading, occlusion, and perspective. Real-photo reading moved from **0.33 to 0.34**. One point.

That non-result is actually the most useful thing I learned. If more data barely moves the needle, the bottleneck is not data, it is **model capacity**. And the prime suspect is that frozen vision encoder I mentioned earlier. The model can reason about signs it reads; it just cannot reliably read faded, sun-bleached Mission Street poles with a vision tower that never got to adapt. So the next experiment is not more data. It is unfreezing the vision encoder.

## I ran the experiment. The hypothesis was wrong.

So I did it. I unfroze the vision encoder, roughly doubled the real training data by pulling parking-sign photos from other cities (Oakland, Chicago, and more), and replaced the single-pass labels with a 3-vote consensus.

Then I tested it the same way I tested everything else: on the full held-out set, no cherry-picking. The result was not what I predicted, and that was the interesting part.

| Metric (real photos) | base | first tune | vision unfrozen + more data |
|---|:---:|:---:|:---:|
| Read F1 | 0.04 | 0.34 | 0.33 |
| Reasoning (pipeline) | 0.78 | 0.89 | 0.90 |
| Reasoning (end to end) | 0.09 | 0.41 | 0.82 |

Reading did not move. 0.34 to 0.33. Unfreezing the vision encoder, the thing I was sure was the bottleneck, did nothing for it. So that hypothesis was wrong too.

But look at the bottom row. End-to-end reasoning on real photos doubled, 0.41 to 0.82. The diverse cross-city data and cleaner labels did not teach the model to *read* better; they taught it to *reason* better about what it does read, and to stop over-calling restrictions on simple poles.

I had one idea left for reading: bolt on a small dedicated OCR model, plus a contrast-normalization transform to rescue faded signs. On a handful of hard images I picked by hand, it looked promising. So I ran a proper A/B across the entire test set before believing it.

It made things worse. OCR text as a hint confused the model on the clean signs it already read fine, and the contrast trick recovered nothing on average. A clean reminder of why you test on the whole set, not the three examples that flatter your idea.

So here is the honest state. Reading faded, cluttered SF sign poles is genuinely hard, and not because of one fixable bottleneck. The model reads simple 1-to-2-sign poles decently and falls apart on dense 4-sign ones. What carries the product is the architecture: because a deterministic resolver does the logic, the verdict stays right about 90% of the time even when a read is imperfect. The neural net is allowed to be the fallible part.

## Try it

I wrapped the tuned model in a little demo. Upload a photo of an SF sign pole, pick a day and time, and it shows you both what each sign says and whether you can park.

- Demo: [the curbcheck Space](https://huggingface.co/spaces/build-small-hackathon/curbcheck)
- Model (the v5 adapter): [shubhamgoel27/curbcheck-qwen25vl3b-v5-lora](https://huggingface.co/shubhamgoel27/curbcheck-qwen25vl3b-v5-lora)
- Code, benchmark, and the full, honest results: [github.com/shubhamgoel27/curbcheck](https://github.com/shubhamgoel27/curbcheck)

It is not solved. Real-world reading is still the open problem, and I find that more interesting than if it had worked on the first try. But there is now a small model that gets the pole that beat me, and a clean experiment pointing at what to try next.

Still a little mad about those tickets. But at least they were tax-deductible as research.
