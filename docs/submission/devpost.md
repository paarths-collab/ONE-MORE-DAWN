# Devpost Submission — One More Dawn

Copy-paste this file into Devpost's **About the project** field. Replace the
two link placeholders after the real Reddit playtest and final video are ready.

## Tagline

A cooperative Reddit survival game where one community builds, protects, and
remembers one shared city - one dawn at a time.

## Elevator pitch

One More Dawn is an asynchronous survival-strategy game where every subreddit
builds one persistent city. Players take limited daily actions, vote on crises,
back a Council strategy, pledge to protect The Marked, and raise their own house
through contribution. At dawn, the city lives with the consequences together.

## Inspiration

I kept thinking about what a subreddit really is.

It is not just a comment section. It is a place where strangers become regulars,
arguments become traditions, and small acts of help slowly turn into a shared
identity.

I wanted to make that history visible.

So I imagined a city at the edge of the last safe dawn: almost empty,
underprepared, and waiting for people who may never meet in real time to decide
whether it deserves to survive.

That became **One More Dawn**.

In this game, a subreddit does not receive a finished kingdom. It starts with a
vulnerable Camp. One person grows food, another restores power, another treats
the sick, another strengthens the city's defenses, and another makes a difficult
vote. Bit by bit, those actions become homes, roads, lights, civic buildings,
and memories.

Then dawn comes.

And the city has to live with what its people chose.

> Every subreddit builds one city. Every dawn asks whether it was enough.

## What it does

**One More Dawn** is an asynchronous community survival game built for Reddit.

Each subreddit shares one persistent city. There are no private islands or
separate kingdoms. Everyone contributes to the same settlement, sees the same
shortages, makes decisions that affect the same future, and returns to see what
the community survived together.

Players choose a survivor role: Scout, Engineer, Medic, Farmer, Guard, or
Speaker. Each day, they use limited energy on food, power, medicine, defense,
and shared construction labor.

A Redditor's first accepted contribution creates their house in the Three.js
city. The first contributor becomes the founder. As more people participate, the
Camp grows into a settlement with homes, shared buildings, roads, defenses, and
a protective dome.

The community can also:

- vote in a daily crisis;
- back a Council strategy;
- pledge to protect The Marked;
- contribute labor to shared construction; and
- discuss strategy through Reddit-connected City Chatter.

At dawn, the server resolves the day. A raid may strike the protective dome,
damage homes, or be held back by preparation. Damaged homes remain part of the
city and stay connected to their owners. Future community labor helps rebuild
them.

$$
\text{Contributions}
\rightarrow
\text{Preparation}
\rightarrow
\text{Community Decisions}
\rightarrow
\text{Raid at Dawn}
\rightarrow
\text{Consequences}
\rightarrow
\text{Rebuilding}
$$

I also built **Reconnect the City**, a daily tile-rotation puzzle where players
restore power through a damaged district network for personal Standing.

## How we built it

I built One More Dawn as a Devvit Web application that runs inside Reddit.

The frontend uses React, TypeScript, Vite, and Three.js. React manages
onboarding, daily actions, voting, City Chatter, the puzzle, Dawn Reports, World,
and Top views. Three.js renders the city: houses, shared buildings, day and night
states, the protective dome, raid effects, damage, and reconstruction.

The backend uses Devvit, Hono, TypeScript, Devvit Redis, and Reddit APIs. Redis
stores city state, player profiles, roles, resources, labor, houses, votes,
pledges, raid outcomes, damage, puzzle completion, and city history.

I made important actions deterministic and server-validated so a shared city
cannot be changed accidentally by duplicate requests.

$$
\text{Accepted Action}
=
\text{Valid Input}
\land
\text{Eligible Player}
\land
\neg \text{Duplicate Action}
$$

Idempotent house registration, per-player daily limits, vote and pledge locks,
safe Redis parsing, and deterministic dawn resolution keep the city consistent
when many Redditors participate.

## Challenges we ran into

The hardest challenge was making asynchronous multiplayer feel emotional.

Redditors do not need to be online at the same moment. One person may help in the
morning, another may vote later that night, and someone else may return after
dawn to discover what happened.

I could not depend on a real-time lobby. Instead, I designed the game around
returning: help today, leave a visible mark on the city, and come back to see how
everyone's choices became a shared consequence.

I also had to make ownership fair. Giving every contributor a house made the city
personal, but losing that house in a raid could feel cruel. I preserved ownership
after damage and made reconstruction a collective responsibility.

Building inside a Reddit webview added practical challenges too: performance,
mobile landscape layout, responsive UI, persistent Redis state, Reddit
permissions, and real comment attribution.

## Accomplishments that we're proud of

I am proud that the city is not merely decorative. It remembers.

- A house means someone contributed.
- A shared building means people worked together.
- The protective dome means the city prepared.
- Damage means dawn had a cost.
- Reconstruction means the community did not leave someone behind.
- The Dawn Report turns those events into shared history.

I am especially proud of the one-redditor-one-house system. A Redditor's first
accepted contribution gives them a visible place in the city. When that place is
damaged, the city gives everyone else a reason to care.

## What we learned

I learned that multiplayer does not need to be real-time to feel alive.

It needs memory. Players need to see that their actions remained after they left,
that other people changed the same world, and that there is a reason to return
after dawn.

I learned that Reddit's asynchronous rhythm is not only a constraint. It can be
the foundation of the experience. Reddit communities already return, react,
debate, remember, and build culture over time. One More Dawn turns that rhythm
into a survival story.

## What's next for One More Dawn

I want One More Dawn to grow with the communities that play it: more daily puzzle
levels, deeper role progression, richer city stages, varied raid outcomes, and
long-term city chronicles.

Two subreddits may begin with the same empty Camp. After enough dawns, they
should not look alike.

> Not just a city-builder. A shared story that a community earns, loses,
> repairs, and remembers together.

## Built With

Devvit, Devvit Web, Reddit API, Devvit Redis, React, Three.js, TypeScript,
Node.js, Hono, Vite, Vitest, HTML, CSS, and WebGL.

## Try it out

- [GitHub repository](https://github.com/paarths-collab/reddit-game)
- Playable Reddit post: **add the real post URL after playtest**
- Demo video: **add the unlisted YouTube URL after export**
