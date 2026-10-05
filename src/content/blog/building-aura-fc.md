---
title: "Building AURA FC: turning soccer footage into live AI commentary"
description: "A build log for a pipeline that watches a soccer clip, works out what just happened, and commentates it back live, plus the three times my first guess was wrong."
pubDate: 2026-06-09
tags: ["computer-vision", "build-log", "football"]
---

I wanted a model to watch a football clip and commentate it back to me, live, with the energy of someone three espressos deep who has strong opinions about the back four. AURA FC is the first version that actually works, and this is how it got built.

The models were never the hard part. The footage was. That, and me getting the footage wrong three times in a row.

## How it fits together

Three stages, and each one only has to be good at one job.

1. **Seeing.** A YOLOv8 detector plus a tracker turns every frame into a list of things: players, the ball, where they are, roughly how fast they're going.
2. **Events.** A small state machine turns that stream of positions into things with names: a pass, a turnover, a run into space, a shot.
3. **Commentary.** Only the events worth talking about reach a language model, which writes a line of play-by-play, and then TTS says it out loud.

Splitting it up like this paid off in a way I didn't plan for. Almost every time the commentary came out wrong, <mark>the actual bug was a stage lower, in the events,</mark> and the language model had nothing to do with it.

## The detector kept losing the ball

Out of the box, the detector found the ball in maybe one frame out of ten. I spent a day or two blaming the tracker before doing the obvious thing: looking at a frame the way the model actually sees it. On a wide broadcast shot the ball is a handful of pixels, and the detector shrinks the whole frame down before it looks at anything. The ball is basically gone before detection even starts.

SAHI fixed it. You run detection on overlapping crops at full resolution and stitch the results back together.<span class="sn">Slicing-aided hyper inference, if you want the full name.</span> It's slower, but <mark>ball recall roughly doubled</mark>, and once the events layer had a ball to follow, "who has it" stopped being a coin flip.

## Everyone looked like they were sprinting

The first version of the events layer thought every player was Usain Bolt. When the broadcast camera pans, every player's pixel speed jumps at the same time, because the whole picture is sliding. The layer was reading camera motion as player motion.

The fix was to estimate how much the whole frame moved<span class="sn">The median displacement across every tracked player, frame to frame. Players run in all directions; a camera pan moves everyone the same way.</span> and subtract that before judging anyone's speed. It <mark>cut the false sprint calls by about half</mark>, and the commentary stopped yelling about runs nobody was making.

## Knowing when to shut up

My first version commented on everything. Every pass, every touch got its own callout, more than one a second. Pure spam.

What fixed it was putting on a real match and noticing how little the commentators actually say. They go quiet for long stretches and only talk when something earns it. So I made callouts expensive on purpose. Low-value events still update the score and the momentum in the background, just silently, and only the big moments get a voice. Around one line every four or five seconds feels watchable. Much more than one a second and you stop hearing any of it.

## What's next

Right now it only handles landscape broadcast footage. Vertical clips are still rough: the ball spends half its life out of frame, and the tracker loses everyone's IDs every time the camera cuts. That's next.

The code's up on [GitHub](https://github.com/shubhamgoel27/soccer-co-commentator), held together with a fair amount of tape. If you want to poke at it, or just want to argue about whether that was a foul, [come say hi](mailto:shubhamgoel27@gmail.com).
