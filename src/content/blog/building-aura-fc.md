---
title: "Building AURA FC: turning soccer footage into live AI commentary"
description: "A build log for a pipeline that watches a soccer clip, works out what just happened, and commentates it back live, plus the three times my first guess was wrong."
pubDate: 2026-06-09
tags: ["computer-vision", "build-log", "football"]
---

I wanted a model to watch a soccer clip and commentate it back to me, live, with the energy of someone three espressos deep who has strong opinions about the back four. AURA FC is the first version that actually works, and this is the build log.

None of the hard parts turned out to be the models. They were the footage, and my own first guesses about how to handle it.

## How it fits together

Three stages, and each one only has to be good at a single job.

1. **Perception.** A YOLOv8 detector and a tracker turn each frame into a list of objects: players, the ball, positions, rough speeds.
2. **Events.** A small state machine turns that stream of positions into things with names: a pass, a turnover, a run into space, a shot.
3. **Commentary.** Only the events worth mentioning reach a language model, which writes a line of play-by-play, and then TTS speaks it.

Splitting it up this way paid off in a way I did not plan for. Nearly every time the commentary came out wrong, the actual bug was a stage lower, in the events, and the language model had nothing to do with it.

## The detector kept losing the ball

Out of the box, the detector found the ball in maybe one frame in ten. On a wide broadcast shot the ball is a few pixels across, and the detector shrinks the whole frame down before it looks at anything, so the ball just vanishes.

SAHI sorted it out: run detection on overlapping crops at full resolution, then stitch the results back together. It is slower, but ball recall roughly doubled. Once the events layer had a ball to follow, "who has it" stopped being a coin flip. The thing I took away from this one was to actually look at what the input looks like by the time it reaches the weights, not what it looks like on my screen.

## Everyone looked like they were sprinting

The first events layer thought every player was Usain Bolt. When the broadcast camera pans, every player's pixel velocity spikes at once, because the whole frame is sliding across itself, and the layer was reading camera motion as player motion.

The fix was to estimate the global motion each frame (the median displacement across all tracked players) and subtract it before judging anyone's speed. That cut the false sprint calls by about half, and the commentary stopped yelling about runs nobody was making.

## Knowing when to shut up

My first version commented on everything. Every pass, every touch, its own little callout, more than one a second. It read as pure spam.

Real commentary is mostly quiet, with words spent on the moments that earn them. So I made callouts expensive on purpose. Low-value events still update the score and the momentum in the background, they just do it silently, and only the high-signal ones get spoken. Somewhere around one line every four or five seconds feels watchable. Much past one a second and you stop hearing any of it.

## What's next

Right now it only handles landscape broadcast footage. Vertical clips are still rough: the ball spends half its life cropped out of frame, and track IDs churn every time the camera cuts. That is the next thing to sort out.

I will put the repo up once it is less held together with tape. If you want a look before then, or you just want to argue about whether that was a foul, [come say hi](mailto:shubhamgoel27@gmail.com).
