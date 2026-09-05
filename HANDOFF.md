# Portfolio Website — Living Handoff

**Last refreshed:** 2026-09-04 PT · copy pass + themed 3D stations `e3cebc5`+next · Ship=Berat
**Chronicle note:** Mac-only living brief — add locks, never delete history; no chat pastes. Keep dense.

---

## 2026-09-04 copy + station-sculpture pass (Berat request)

- Nav/heading renames (content.ts): Published proof→**Publications**, Versioned resumes→**Projects**, Systems vocab→**Skills**.
- Station sublines (journey-beat) REMOVED everywhere (Station beat prop deleted; About/Pubs/XP/Projects beats gone). CSS `.journey-beat` + `.journey-contact-note` removed.
- Contact repetition trimmed: message = "Open to AI systems / ML engineering roles — full-stack craft included."; utility-menu note paragraph deleted.
- Skills now exhaustive: added discord.py, Hydra, Tmux, Runpod (AI & agents); SQLite, SQL, Neon, Zod (Full-stack); SCRUM (Systems & delivery); new **Foundations** cluster (Data Structures, Algorithms).
- Pub PDF hover previews enlarged: non-lead 22→27rem, lead 26→32rem, iframe 28→34rem / 58→72vh.
- Journey 3D: generic STATION_SHAPES replaced by themed wireframe sculptures per chapter (journey-scene.ts STATION_BUILDERS): About=origin spiral, Publications=paper stack, Experience=career steps, Projects=git branch graph, Skills=atom w/ moons, Contact=interlocked rings. Same tint/opacity/positions; stations now Object3D groups.
- e2e updated (labels, beats block deleted). tsc/eslint/vitest/journey-spec green. Ship verify = Berat.

## Goal

Creative interactive portfolio hireability-showcasing Berat (AI/ML systems primary).

## Repo

- Remote: https://github.com/bercev/portfolio_website
- Local: `~/projects/portfolio_website`
- PR #1: base `gpt` · head `feat/journey-vitae-hireable`
- Mac checkout + push only (Cloud Agents no GitHub access)
- HEAD tip: `e5482ff` (air/hero DONE; trail prior `5f40554`; cleaner `0b4804f`)
- Light mode DONE at `dfc19a6` — Journey NormalBlending + no bloom in light (Additive/bloom was wiping BERAT on light clear); dark path unchanged. `de9ea1a` = html.dark lightTheme gate. Light DONE. Cleaner/calmer **DONE** `0b4804f`.

## Stack

Next.js 16, React 19, Tailwind v4, Motion/GSAP/Three/ogl, effect-policy, Playwright, Netlify.

## Crew

Orchestrator B, Vision, Architect, Effects, Resume, Chronicle active; Builder outside; Ship parked (verify=Berat).
- Anti-slop Vision-signed (Pubs shelf GO); Berat follow-up locks **DONE** at `621d7ec`. Vision feel-check next; Ship = Berat.

---

## Creative spine locks

- Journey scroll spine + Vitae immersive deep-dive; glass material only; no second 3D artifact
- Hireability `content.ts` done (`identity.role` Software Engineer; AI/ML primary)
- Discord href https://github.com/bercev/Discord-Chatbot-AI — readable/quiet card only
- Vitae proof `vitae.tools` only
- Overlay WHAT→Outcomes→Stack→CTA; premise exact: *Version-controlled resume builder shipped with a 5-person team.*
- Stack/linger from `project.technologies` only; no `VITAE_CASE.stack`
- Liquid-glass is accent (Vitae) — not default station chrome

---

## Slice 1

**LANDED.** Journey spine + Vitae orbit + glass tokens + hireability content.ts (8586b2e, 81c702e, d92cc9c, 0a81a50). Playwright=Berat.

---

## Slice 2

**DONE / CLOSED** (Effects+Vision GO) · head `22ab59b`

- ff26e95 setPaused · 6e6f1dd flutter · c241fa6 page-stack · c2fa2a6 linger>=400ms · 22ab59b peel/edge-flash
- Overlay premise exact; WHAT→Outcomes→Stack→vitae.tools; no VITAE_CASE.stack

---

## Slice 3

### Taste / anti-slop — Pass 1 + Pass 2 DONE

- **Pass 1 (hard edges) — DONE:** hard-edged panels, glass radius 8px, liquid-glass accent-only
- **Pass 2 (asymmetry) — DONE:** outboard Experience, flat Discord, harder type (uneven columns / editorial pubs)
- **HEAD:** `621d7ec` (Berat taste locks DONE; anti-slop Vision-signed prior)
- Pass1+Pass2 DONE
- Pubs-as-shelf + chip cleanup **DONE** (`b73919f` — overlapping previews, marginalia, chip cleanup)
- **Anti-slop FULLY signed by Vision** (Pubs shelf GO)
- About personal narrative **LANDED** (`97fc1c5`/`53ff303`) — six chronological paragraphs in about.bio (Discord→Trustd→research/DSA→Vitae→multi-agent intern)


**LANDED** · head `621d7ec`

| Commit   | Change |
|----------|--------|
| `2f616c5` | Station layouts + Resume slice-3 labels/beats |
| `5f33744` | Editorial hard edges; liquid-glass accent-only |
| `ac17d68` | Discord quiet card (no badge) |
| `2702fc4` | Pass2 asymmetry progress |
| `b674281` | Pass2 DONE — outboard Experience, flat Discord, harder type |
| `b0ec86d` | Pubs hard paper preview nit closed; strip CSS confirmed |
| `b73919f` | Pubs-as-shelf DONE — overlapping previews, marginalia, chip cleanup |
| `97fc1c5` | About personal narrative (Berat-approved six paragraphs) |
| `53ff303` | about.bio trailing-comma fix |
| `92f9c9f` | About single editorial column; anti-slop Vision-signed (Pubs shelf GO) |
| `621d7ec` | Berat taste locks DONE — shared column, pointer-cam home+contact only, number-only kickers, muted contrast |
| `9ee074c` | pointer-look off until home/contact IO |
| `dfc19a6` | Journey NormalBlending + no bloom in light (BERAT readable) — light mode DONE |
| `de9ea1a` | html.dark lightTheme gate — light DONE |
| `0b4804f` | cleaner/calmer DONE — soft subtract SaaS chrome; Journey/Vitae/Pubs/About preserved |
| `5f40554` | Journey trail opacity cut |
| `e5482ff` | air/hero DONE — bio out, fade-in, air, quieter chrome **HEAD** |

Station labels (content.ts → nav/headings):
- Pubs → Published proof
- Projects → Versioned resumes
- Skills → Systems vocab
- About origin → UCSC CS · 4.0 · building AI systems
- Intern beat → Multi-agent systems in production

---

## Do not break

- effect-policy
- no second cursor
- no scroll/hash/LineSidebar steal
- no second composer
- no new 3D
- Ship verify=Berat
- snapshots only Journey-port + Vitae hotspot — never wholesale regen

---


### Berat follow-up locks — DONE

- **DONE** at HEAD `621d7ec`
- Vision feel-check next
- Ship still Berat

Overrides previous chrome habits. No new 3D. Ship verify = Berat.

1. **Alignment** — one shared content column / same left edge (Hero→Contact); kill scattered per-station offsets / mismatched max-widths. Rhythm via type/panels OK; column geometry unified.
2. **Pointer camera** — mouse-look / parallax **only** on `#home` + contact. Mid-stations scroll-driven only (Effects owns gate).
3. **Station chrome** — kicker = padded **number only** (e.g. `01`); drop Station / em dash / kicker prose. Section titles still carry hireability labels.
4. **Type contrast** — bump `--muted-foreground` (light+dark); readable ink, no muddy mid-gray body.

Keep Journey setPaused, Vitae, effect-policy, nav.

## Open TODOs

- cleaner/calmer pass **DONE** at `0b4804f`: subtracted journey-mark tags, Skills pill farm→middot lines, Vitae overlay outcome chip farm (deep-dive chips kept), dead tag CSS, hero `01 — Home`→`01`. Preserved Journey/Vitae/Pubs/About/Pass-2/light.

- Vision feel-check on Berat taste locks (`621d7ec`)
- human Playwright (Berat)




---
---

## Dense context (additive)

- Vision+Architect GO on taste locks `621d7ec`; Effects pointer gate + `pointerLookHot` init false (`9ee074c`).
- Effects light-mode GO on `dfc19a6`/`de9ea1a` (html.dark lightTheme, NormalBlending, no light bloom).
- Cleaner refs soft-guide only (afceran/justin) — subtract SaaS chrome; do NOT redesign Journey/Vitae/Pubs/About.


**Build:** Mac checkout+push only; Cloud Agents blocked for this GitHub combo.

**10s vs play:** Pubs (SkillOptimizer + @GrokSet) + intern systems + Vitae CTA = scan. Mesh/peel/linger = play. Skip RAG/SubAgentTesting unless pulled.

**Resume:** AI/ML primary; Vitae=vitae.tools; Discord quiet+public repo; About 6-para story (single column). Labels: Published proof / Versioned resumes / Systems vocab / Multi-agent systems in production.

**Vision:** Journey+Vitae spine; glass accent-only; anti rounded-card monoculture; Pubs shelf GO (b73919f).

**Architect:** one-pager; dual WebGL + setPaused; effect-policy; no second artifact/composer/cursor; no scroll/hash/LineSidebar steal; CSS vars only; snapshots Journey-port+Vitae only. Surfaces: globals.css, portfolio-card, station, section-heading, section layouts.

**Effects:** page-stack mesh; linger 400ms; pointer-look only #home+contact (621d7ec/9ee074c); mid-stations scroll-driven.

**Berat locks DONE (621d7ec):** shared column · pointer-cam home+contact · number-only kickers · muted contrast. Vision feel-check next.

**Ship:** Berat Playwright. RM/static Vitae card intact; effect-policy green; dual-WebGL e2e stable.

**Cmds:** cd ~/projects/portfolio_website && nm test && npx playwright test · PR #1 feat/journey-vitae-hireable -> gpt

**Light mode:** DONE at tip `de9ea1a` (incl. `dfc19a6` NormalBlending + no light bloom; dark unchanged).

**Cleaner/calmer:** DONE at `0b4804f` — soft subtract SaaS chrome; Journey/Vitae/Pubs/About preserved.
- Vision cleaner GO; Resume hireability GO on `0b4804f` (marks gone; Skills middot vocab; hero `01`; Vitae deep-dive outcomes kept).

**Crew:** air/hero landed `e5482ff` — awaiting Vision glyph-band confirm. Ship/Playwright=Berat.

**Open:** Vision confirm glyph-band hard fail cleared on `e5482ff` · human Playwright / Ship verify (Berat)

---

### Air / hero polish — DONE at `e5482ff` (trail `5f40554`)

**Vision glyph-band hard fail — awaiting Vision confirm on `e5482ff`:** role/location/tagline must CLEAR BERAT glyph band (implementation claims DONE; Vision must verify). Trail cut landed `5f40554` (L 0.55→0.18 / D 0.4→0.16).


HEAD still 0b4804f until push/SHA. Keep Journey/Vitae/Pubs. No new 3D.

1. Hero = tagline + scroll only; kill mono bio dump. One under-name AI line OK — never overlap BERAT.
2. Air — station padding-block + About gaps +~20-30%.
3. Chrome — drop Skills+Contact beats; kill Tools:/Built with: labels.
4. Tagline under BERAT; meta quieter evenly spaced.
5. First-load fade-in (RM=instant).
6. Effects trail opacity light 0.55->0.18 dark 0.4->0.16.

Done: less stacked; hero not second About; no BERAT overlap; soft trail.

### FINALIZE note (2026-09-04 PT)
Paste-ready brief delivered via Orchestrator B. HEAD `0b4804f`. Light DONE `de9ea1a`/`dfc19a6`. Air/hero **not landed**.
