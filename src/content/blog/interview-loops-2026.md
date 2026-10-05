---
title: "What ten ML interview loops taught me"
description: "Four months, about ten companies, a lot of rounds. What actually decided things, what I'd prep differently, and the one weakness that kept showing up."
pubDate: 2026-10-05
tags: ["career", "interviews", "machine learning"]
draft: true
---

Between June and September I interviewed for senior ML engineer roles at about ten companies: big tech, an AI lab, streaming, social, and a couple of marketplaces. Some loops ended at the first screen. Two went all the way through the onsite and ended in a no. One ended in an offer I said yes to.

I kept notes after every round, mostly so I'd stop making the same mistakes. Reading them back now, the patterns are pretty clear, and almost none of them are the things I spent the most time preparing for.

## The ML part was rarely the problem

I went in worried about the ML rounds. Would I blank on some loss function, get caught out on a paper I hadn't read? That almost never happened. Eight years of actually shipping models goes a long way when the conversation is about ranking, retrieval, eval design, or distillation. Those rounds were mostly fun.

What decided things, over and over, was live coding. Not whether I could solve the problem. I usually could, or got close. It was *how* I solved it with someone watching. The feedback from the loop that hurt the most said it plainly: the team wanted to see more independence in the execution round. Everything else had landed. That one round was enough.

Looking back at my notes, the pattern is embarrassingly consistent. I'd see the right approach quickly, then write a first version with a small bug in it: a `==` where I meant `=`, an index off by one, a second data structure I forgot to keep in sync. And I'd say "done" before running a single example by hand. The interviewer would find the bug, and the round would quietly turn from "strong" into "needed prompting."

The fix that actually helped wasn't more LeetCode. It was a habit: before I say I'm done, I trace one normal input and one edge case through the code, out loud, for about sixty seconds. I catch my own bug instead of watching them catch it. It's boring and it works.

## Read the job description like it's the syllabus

My worst prep miss was a computer vision role where I studied the company's generic interview guide: the classic algorithms, the usual NumPy implementations. The actual round was built straight off the job description. The JD talked about vision-language models, and the problem was implementing a piece of one in PyTorch.

None of my practice problems came up. If I'd prepped the architecture named in the JD instead of the generic list, I'd have walked in warm. Now the first thing I do with any loop is underline every model, system, and technique in the job description and assume each one is fair game.

## Rounds aren't always what they're called

A round called "coding" turned out to be an applied problem: detect anomalies in a stream of latency numbers, start simple. A round called "ML design" turned out to be an incident: a metric spiked and then crashed a couple of hours after a model deploy, walk me through it.

I handled that second one like a modeling problem and went straight to diagnosis: drift, feature coverage, calibration. All reasonable. What I missed is the first thing anyone who's been on call does, which is stop the bleeding. Roll back to the previous model, *then* figure out why. In an incident, mitigation comes before understanding. I knew that from real life and still didn't say it in the room.<span class="sn">The sharper read I also missed: the spike was probably the actual anomaly, a miscalibrated model over-predicting, and the drop was the system correcting.</span>

## The best question I got was about my own eval

In one onsite, a hiring manager with a statistics background asked a simple question about a distillation project: how did I know the teacher model's labels were any good?

The honest answer was that I mostly assumed they were, with some light spot-checking. It wasn't a great answer, and I could feel it land that way. But it stuck with me. A few weeks later I ran a proper audit of the teacher labels in a side project and found that about one in eight was wrong. That question made me a better engineer, and I got it from an interview I was nervous about.

When an interviewer finds the edge of what you know, that's usually the point of the round. A clear "I don't know, here's how I'd find out" holds up better than a confident wrong answer.

## The way I talk was costing me

Somewhere along the way I learned that in a long technical answer I say "like" about once every twenty words, and stack hedges on top: "I think maybe we could kind of use X." My content was senior. My delivery made it sound like I wasn't sure.

The fix is simple to say and annoying to do: replace "like" with a pause, say "I'd use X" instead of "maybe X," and give real numbers instead of "some features." I'm still working on it. This paragraph would've had six "likes" in it a few months ago.

## Results don't always explain themselves

One screen felt like one of my best and came back as a canned rejection with no feedback. Another, I didn't finish the coding problem at all and still passed, because the round was graded on reasoning and fit, not the final code. You don't get to see the rubric. After a while I stopped trying to read meaning into a single result and started looking for patterns across several.

## What I'd tell myself in June

- **Treat live coding as its own skill.** Narrate, write test cases first, start with the simplest structure, and trace your code before you call it done.
- **Prep the JD, not the generic guide.**
- **Know what kind of round it really is.** For anything that looks like an incident, mitigate first.
- **Have real stories ready for "a time you were wrong."** Mine were thin, and it showed.
- **Keep notes after every round.** That's the only reason I can write this post.

I ended up with an offer I'm really happy about. More on that once I've started.
