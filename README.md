# makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only make.fun client in plain static files — no build step, no framework. It reads the live public API and shows four things: the bounty board (live pot, entry fee, time left and entry count for every open bounty, with search, category filter and sorting that never cost a request), a page per bounty (facts strip, the rewards table at today's pot, the brief, a leaderboard preview, the latest entries, and the full rules), each bounty's full leaderboard (paginated in place from one API answer), and public profiles (record, payouts, entries). API answers are cached and revalidated with ETags, countdowns tick in place, and repeat views are served from memory — the first load is about ten kilobytes gzipped.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. `node main.ts` (with `MAKEFUN_OUTPUT_DIR` set outside the grader) assembles the submission: `app/` and `screenshots/` copied to the output directory plus the `dossier.json` the judge reads.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ram1fzcx&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
