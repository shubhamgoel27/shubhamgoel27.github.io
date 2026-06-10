---
title: "Building AURA FC: turning soccer footage into live AI commentary"
description: "What I learned wiring up a real-time pipeline that watches a soccer match, figures out what just happened, and commentates it back to you live."
pubDate: 2026-06-09
tags: ["computer-vision", "build-log", "football"]
---

I wanted to see if I could point a model at a soccer clip and have it commentate the match back to me, live, with the energy of someone who has had three espressos and a strong opinion about the back four. The project is called AURA FC, and this is the build log for the first working version.

The fun part was not any single model. It was discovering, repeatedly, that the obvious approach was wrong, and that the footage itself was the real adversary.

## Three layers, one illusion

The whole thing is three layers stacked on top of each other, and the trick is that each layer only has to be good at one thing.

1. **Perception.** A YOLOv8 detector plus a tracker turns raw frames into a list of objects: players, the ball, who is where, moving how fast.
2. **Events.** A thin state machine turns that stream of positions into things that have *names*: a pass, a turnover, a sprint into space, a shot. This is where raw pixels become something worth talking about.
3. **Commentary.** Only the high-signal events get handed to a language model, which turns them into a line of play-by-play, then to TTS so it actually speaks.

Keeping these separate mattered more than I expected. When commentary felt off, the bug was almost always one layer down, in the events, and the fix had nothing to do with the language model at all.

## Lesson 1: the ball is tiny, and detectors hate that

Out of the box, the detector found the ball in roughly one frame out of ten. A soccer ball is a handful of pixels on a wide broadcast shot, and standard detection resizes the whole frame down before it ever looks at it, so the ball basically evaporates.

The fix was **SAHI** (slicing-aided hyper inference): run the detector on overlapping crops of the frame at full resolution, then stitch the detections back together. Slower, but it roughly doubled ball recall. Suddenly the events layer had something to track, and "who has the ball" stopped being a coin flip.

> Takeaway: when a model fails on small objects, the problem is usually resolution, not the model. Look at what the input actually looks like by the time it reaches the weights.

## Lesson 2: the camera moves, so everyone is always sprinting

The first version of the events layer thought every player was Usain Bolt. The reason is embarrassing in hindsight: when the broadcast camera pans, *every* player's pixel velocity spikes, because the whole world is sliding across the frame. The model was reading camera motion as player motion.

The fix was to estimate global motion (the median displacement of all tracked players between frames) and subtract it before judging anyone's speed. That one change cut false "sprint" events roughly in half and made the commentary stop screaming about runs that were not happening.

## Lesson 3: restraint is a feature

My first instinct was to comment on everything. Every pass, every touch, every turnover got a callout. The result was a wall of popups, more than one per second, and it read as pure spam.

Real commentary is mostly silence punctuated by the right moment. So I made callouts expensive on purpose: low-value events update the internal state silently (they still move the score and the momentum), and only high-signal moments earn words. For something meant to be watchable, around one callout every four to five seconds reads clean. Past one per second, your brain checks out.

The deeper lesson is one I keep relearning: an attention budget is a design constraint, not an afterthought. What you choose *not* to say is most of the craft.

## What's next

The current version runs on landscape broadcast footage. Vertical clips are still rough: the ball spends most of its life cropped out of frame, and track IDs churn every time the camera cuts. That is the next hill.

I will put the repo up once it is less held together with duct tape. If you want a look before then, or you just want to argue about whether that was a foul, [come say hi](mailto:shubhamgoel27@gmail.com).
