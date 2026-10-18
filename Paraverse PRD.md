# Paraverse: Product Requirements Document

Oct 18, 2026 · @Nithyananthan Subash Babu

## 1. Overview

Paraverse is a web platform that rehearses a workplace change (a new HR portal, expense tool, onboarding flow, or ticketing form) on a calibrated swarm of synthetic employees before it reaches real ones, and predicts friction, drop-off, time lost, and support load.

**Hackathon category:** Future of Work and Enterprise Productivity. **Build constraints:** Gemini or Gemma models, deployed on Google Cloud Run, built at zero cost.

**Problem.** Enterprises cannot A/B test internal tools on employees: populations are small, mistakes cost real productivity, and rollouts are often all-or-nothing. Failed adoption shows up later as support tickets, workarounds, and lost hours. Example: a confusing expense form that adds 4 minutes for 20,000 employees, 12 times a year, costs about 16,000 hours.

**Solution.** Gemini-powered persona agents (new hires, power users, non-native speakers, accessibility needs, frontline mobile staff) operate the real interface through a headless browser. Each agent narrates its confusion while it works. Paraverse aggregates the runs into a funnel, a friction map, an hours-lost estimate, and ranked fixes, then re-simulates a fix to confirm the improvement. A calibration layer, tested against past rollouts with known outcomes, reports how far the prediction can be trusted.

**Positioning.** Paraverse is a pre-launch rehearsal that kills obvious failures cheaply and tells teams where to point real pilots. It does not replace real user testing.

## 2. Goals, non-goals, and success metrics

The prototype succeeds if it predicts the right winner on past rollouts, shows a clear friction finding live, and runs end to end on Cloud Run at zero cost.

**Goals**

- Simulate a diverse synthetic workforce operating a real web UI, not a text description of it.
- Predict completion rate, time-on-task, drop-off step, and confusion points per workforce segment.
- Translate friction into hours lost per year and avoided support tickets.
- Prove trustworthiness through calibration against past rollouts with known outcomes.
- Close the loop: suggest a fix, re-simulate it, and show the improvement.

**Non-goals (prototype)**

- Replacing real user research or pilots.
- Using real employee data. Personas come from aggregate segment descriptions only.
- Native mobile apps or desktop software. Scope is web UIs.
- Production-grade multi-tenancy, SSO, or billing.

**Success metrics**

| Metric | Target | How measured |
| --- | --- | --- |
| Calibration: correct winner on seeded past rollouts | at least 6 of 8 (uncalibrated baseline about 4 of 8) | Predicted vs known outcome |
| Direction-of-effect accuracy | at least 75% | Sign of predicted lift vs known lift |
| Live run completes end to end | 10 to 20 agents in under 10 minutes | Dashboard run timer |
| Fix loop shows improvement | drop-off at flagged step falls by at least 50% | Re-simulation of fixed variant |
| Recorded large study | 100 or more agents, 3 variants | Stored run in replay mode |
| Infrastructure cost | $0 | Billing console, no paid Gemini usage |
| Accessibility of the product itself | no critical axe-core violations | Automated audit on dashboard |

## 3. Users and personas

Paraverse serves the people who ship internal changes, and simulates the people who receive them.

**Buyers and operators**

| Role | Need | What they do in Paraverse |
| --- | --- | --- |
| IT change manager | Know if a rollout will cause a ticket spike | Run a variant, read the support-load estimate |
| HR operations lead | Make onboarding and policy flows easy | Compare flow versions across new-hire segments |
| Internal tools product owner | Prioritize fixes with evidence | Review ranked fixes and re-simulate |
| Digital workplace or accessibility lead | Find equity gaps before launch | Filter results by accessibility and device segments |

**Synthetic workforce segments (simulated users)**

| Segment | Traits that drive behavior |
| --- | --- |
| New hire | Low tenure, unfamiliar with internal jargon, reads every label |
| Power user | High speed, skips instructions, hits edge cases |
| Non-native speaker | Slower on dense copy, misreads idioms and abbreviations |
| Frontline mobile worker | Small screen, interrupted, low patience, thumb-only input |
| Low-vision or screen-reader user | Zoom, high contrast, keyboard-only navigation |
| Occasional user | Forgets steps, needs clear recovery paths |

Each persona carries structured traits: tenure, tech literacy, language fluency, device, patience budget (maximum steps and seconds before abandoning), and accessibility needs. Population mixes are configurable and reported with every result so readers know what was simulated.

## 4. Core user flows and user stories

The primary flow takes a change manager from a URL to a ranked list of fixes in five steps.

1. **Define the test.** Enter the app URL (or choose the built-in demo), name the task ("submit an expense report"), and pick the variants to compare.
2. **Choose the workforce.** Select segments and population size, or accept the default mix.
3. **Run the swarm.** Watch agents operate the UI live on the swarm wall, or load a recorded study.
4. **Read the report.** Funnel, friction map, think-aloud quotes, hours lost per year, and support tickets avoided, filtered by segment.
5. **Fix and re-test.** Review ranked fixes, apply one, and re-simulate to see the delta.

**User stories**

| ID | As a... | I want to... | So that... | Priority |
| --- | --- | --- | --- | --- |
| US1 | change manager | compare two versions of a flow on a synthetic workforce | I pick the better one before launch | P0 |
| US2 | change manager | see the exact step and label where users get stuck | I know what to fix | P0 |
| US3 | HR ops lead | read agents' own explanations of confusion | I understand why, not only where | P0 |
| US4 | product owner | see predicted hours lost per year | I can justify the fix to leadership | P0 |
| US5 | product owner | get ranked fix suggestions and re-test them | I confirm the fix works | P0 |
| US6 | any user | see how reliable the prediction is | I know how much to trust it | P0 |
| US7 | accessibility lead | filter results by accessibility and device segment | I find equity gaps | P1 |
| US8 | change manager | replay a recorded study | I can review results without waiting | P1 |
| US9 | tools owner | export a shareable report | I can send findings to stakeholders | P2 |

## 5. Functional requirements

P0 items are required for the demo, P1 items are built if time allows, and P2 items are roadmap.

| ID | Requirement | Priority |
| --- | --- | --- |
| FR1 | Persona generator creates N personas (default 20, up to 150) from segment definitions with structured traits and a patience budget | P0 |
| FR2 | Swarm agent loop: capture screenshot and DOM summary, ask Gemini for the next action, execute it in Playwright, log the action | P0 |
| FR3 | Each step records a think-aloud note, confidence, and a "confused" flag with reason | P0 |
| FR4 | Agents stop on goal completion, abandonment (patience exhausted), error, or step cap (12) | P0 |
| FR5 | Rate-limited request queue with token bucket, exponential backoff with jitter, and per-step checkpointing | P0 |
| FR6 | Built-in demo expense app with three versions: baseline, flawed redesign, fixed | P0 |
| FR7 | Metrics engine: completion rate, time-on-task, step count, errors, drop-off step, confusion clusters, by segment | P0 |
| FR8 | Hours-lost calculator: employees x frequency x extra minutes, with editable inputs | P0 |
| FR9 | Variant comparison: predicted lift with confidence interval across variants | P0 |
| FR10 | Calibration module: replay seeded past rollouts, tune persona mix, report accuracy and a per-prediction confidence score | P0 |
| FR11 | Fix suggester: Gemini proposes ranked changes for the worst step, with expected impact | P0 |
| FR12 | Re-simulation of a fixed variant and side-by-side delta view | P0 |
| FR13 | Swarm wall: live grid of agent screens with status, current step, and think-aloud caption | P0 |
| FR14 | Replay mode streams a stored large run from Firestore and Cloud Storage | P0 |
| FR15 | Report view: funnel, friction heatmap on screenshots, quotes, segment filters | P0 |
| FR16 | Accessibility personas: keyboard-only and zoomed or high-contrast runs, flagging WCAG-style issues | P1 |
| FR17 | Support-ticket estimate derived from confusion and abandonment rates | P1 |
| FR18 | Point the swarm at any public URL with a task description | P1 |
| FR19 | Exportable PDF or shareable link of a report | P2 |
| FR20 | GitHub Action posting predicted impact on UI pull requests | P2 |

**Acceptance criteria for the core loop (FR2 to FR12)**

- A run of 15 agents on the demo app finishes with no unhandled agent crash, and every agent has a terminal state.
- The report names the flawed step in the flawed variant and does not flag it in the fixed variant.
- Re-running the fixed variant reduces drop-off at the flagged step by at least 50%.
- Every metric shown on the dashboard is traceable to stored step logs.

## 6. System architecture and tech stack

Paraverse runs as one stateless Cloud Run service plus a swarm runner, with Gemini in a separate project so model usage can never bill.

&#91;embedded content: architecture · 3 layers, 2 projects\]

A judge opens the dashboard on Cloud Run, which starts a study. The swarm runner browses the demo app, calls Gemini for every step, and writes step logs and screenshots to storage. The analysis engine reads those logs, calls Gemini for the findings and fixes, and the dashboard renders the result. The dashboard also replays stored runs directly from storage.

**Tech stack**

| Layer | Choice | Reason |
| --- | --- | --- |
| Front end | React dashboard served by the Cloud Run service | One deployable unit, fast to build |
| API and analysis | Python (FastAPI) | Simple async handling of runs and metrics |
| Browser automation | Playwright with Chromium only | Real UI interaction, small image |
| Models | Gemini Flash-class (vision) for agents, stronger model for analysis, Gemma where free | Meets the Gemini or Gemma requirement, keeps quota use low |
| Orchestration | Plain async queue with token bucket. Google Agent Development Kit if time allows | Smallest thing that respects rate limits |
| Data | Firestore for records, Cloud Storage for screenshots and traces | Free tiers, no servers to run |
| Deployment | Cloud Run (request-based billing, min-instances 0) | Required platform, scales to zero |
| Production path | Cloud Run Jobs, one task per agent | Parallel fan-out for large studies |

## 7. Gen AI design

Gemini is the core mechanism: it perceives the screen, reasons as a specific persona, acts, and explains itself. Without it, the product cannot exist. Model names change often, so confirm current identifiers in AI Studio and keep them in one config file.

**Agent roles**

| Agent | Model class | Input | Output |
| --- | --- | --- | --- |
| Persona generator | Flash or Flash-Lite (text) | Segment definition, trait ranges | Structured persona JSON |
| Swarm agent | Flash-class, vision | Persona, task, screenshot, DOM summary, last 3 steps | One action plus think-aloud note |
| Analyst | Stronger model, or Flash if quota is tight | Aggregated metrics and sampled quotes | Findings narrative, confusion clusters |
| Fix suggester | Same as analyst | Worst step, screenshots, quotes | Ranked fixes with expected impact |
| Calibration judge | Flash (text) | Predicted vs known outcome | Match score, with explanation |

**Swarm agent loop**

1. Capture a downscaled screenshot and a compact list of visible interactive elements.
2. Prompt Gemini with the persona, goal, and recent history, requesting strict JSON.
3. Validate the JSON, execute the action (click, type, scroll, wait, give up), and log it.
4. Check stop conditions: goal reached, patience budget exhausted, error, or 12 steps.

**Action schema (agent output)**

```json
{
  "thought": "I don't know what 'cost center' means here.",
  "confused": true,
  "confusion_reason": "jargon in label",
  "action": "click",
  "target_id": "el_14",
  "value": null,
  "confidence": 0.4
}
```

**Persona conditioning.** The system prompt encodes traits as behavioral rules, not a story: reading speed, willingness to guess, how long to persist, and how language fluency affects interpretation of labels. A rule such as "if a label uses an acronym you were not told, treat it as unclear" produces measurable differences between segments.

**Honesty guardrails.** Agents may only act on elements present in the supplied element list. Hallucinated targets count as errors, not as successes. Think-aloud notes are stored verbatim and never edited, so quotes shown in reports are traceable.

**Calibration (the differentiator).** Seed 6 to 8 past rollouts with known outcomes, such as which form variant won and by how much. Run the swarm on each, compare predicted ranking and direction with the known result, and tune persona mix weights (for example, share of low-patience users) to maximize agreement. Report accuracy before and after tuning, and attach a confidence score to each new prediction based on how well that task type calibrated.

**Gemma option.** Gemma can serve the persona generator and calibration judge to save Gemini quota, if an open-model endpoint is available at no cost. Vision-heavy swarm steps stay on Gemini.

## 8. Data model and metric definitions

Every metric derives from stored step logs, so any number on the dashboard can be traced to individual agent actions.

**Firestore collections**

| Collection | Key fields |
| --- | --- |
| studies | id, name, task, variant ids, segment mix, created, status, mode (live or recorded) |
| variants | id, study id, url, label, notes |
| personas | id, study id, segment, traits (tenure, literacy, fluency, device, patience budget, accessibility) |
| runs | id, study id, variant id, persona id, outcome (completed, abandoned, error, step cap), steps, duration |
| steps | run id, index, screenshot path, action, target, thought, confused flag, confusion reason, confidence, timestamp |
| calibration | id, rollout name, known winner, predicted ranking, match, persona mix used |
| fixes | id, study id, step, suggestion, expected impact, resimulated result |

Screenshots and traces live in Cloud Storage, referenced by path from `steps`.

**Metric definitions**

| Metric | Definition |
| --- | --- |
| Completion rate | Runs with outcome completed divided by all runs |
| Time-on-task | Sum of simulated step durations (agent latency excluded; each action is assigned a persona-scaled human time cost) |
| Drop-off step | Step index where most abandoned runs ended |
| Confusion rate | Steps flagged confused divided by total steps |
| Extra minutes per task | Variant mean time-on-task minus baseline mean |
| Hours lost per year | employees x tasks per year x extra minutes per task / 60 |
| Support tickets avoided | Confusion and abandonment rate delta x employees x tasks per year x ticket conversion factor (configurable, default 2%) |
| Prediction confidence | Calibration accuracy for the matching task type, adjusted for sample size |

**Hours-lost formula**

```latex
H = \frac{N \times F \times \Delta m}{60}
```

where N is employees affected, F is task frequency per employee per year, and delta m is predicted extra minutes per task.

## 9. Non-functional requirements

The binding constraint is cost: the whole prototype must run at $0, which shapes rate limits, run sizes, and the live-versus-recorded demo split.

**Zero-cost plan** (as of October 2026; verify current terms before relying on them)

| Area | Approach |
| --- | --- |
| Cloud Run | Request-based billing, min-instances 0. Always Free tier: 2M requests, 180K vCPU-seconds, 360K GiB-seconds per month ([Cloud Run free tier](https://agentdeals.dev/vendor/google-cloud-run)) |
| Gemini API | AI Studio key in a separate project with no billing attached, so usage cannot become a charge. Free tier is rate-limited, and limits are shown per project in the AI Studio console ([Gemini API free tier](https://benchlm.ai/free-tier/google-ai-studio)) |
| New-account credit | Use the free-trial account, not a pay-as-you-go upgrade. A $300, 90-day credit is offered to new accounts ([Google Cloud free tier overview](https://wikidocs.net/blog/@infoplant/25939/)) |
| Storage | Firestore and Cloud Storage free tiers. Slim container images and deletion of old versions to stay inside Artifact Registry free storage |
| Guardrails | Budget alerts at $1, $5, and $10. Alerts only notify, so paid Gemini usage is never enabled |

**Performance and scale**

- Live demo: 10 to 20 agents, 12 steps each, under 10 minutes through the rate-limited queue.
- Recorded study: 100 or more agents run offline over hours or days on free quota, checkpointed per step.
- Dashboard loads a recorded study in under 3 seconds.
- Production path: Cloud Run Jobs fan out one task per agent, scale to zero when idle, and cost is per run.

**Security and privacy**

- No real employee data. Personas and demo content are synthetic.
- Free-tier Gemini requests may be used to improve Google products, so nothing confidential is ever sent.
- API keys in Secret Manager or environment variables, never committed.
- Agents run in isolated headless browsers with no access to credentials or internal networks.
- Production version runs inside the customer's own GCP project with their own model access.

**Accessibility and usability of the product**

- Dashboard meets WCAG 2.1 AA basics: keyboard navigation, contrast, labels, focus states.
- Charts have text alternatives and do not rely on color alone.
- Swarm wall has a reduced-motion option.

**Reliability**

- Every agent reaches a terminal state, and failed calls retry with backoff before counting as an error.
- A cached recorded run guarantees the demo works even if the free quota is exhausted.

## 10. UX and key screens

The interface has four screens, and a first-time user should reach a result in under three clicks from the home screen.

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Setup | Define the test | URL or demo picker, task description, variant list, segment mix sliders, agent count, hours-lost inputs (employees, frequency), Live or Recorded toggle |
| Swarm wall | Watch the run | Grid of agent screens, each with status, current step, and a think-aloud caption; progress bar; queue and quota indicator |
| Report | Understand the result | Funnel by variant, friction heatmap over screenshots, confusion clusters with verbatim quotes, hours lost, tickets avoided, segment filter, confidence badge |
| Fix and re-test | Close the loop | Ranked fixes with expected impact, apply to variant, re-run, before and after delta |

**Design principles**

- Evidence first: every number links to the steps and quotes behind it.
- Plain language: reports read for a change manager, not an ML engineer.
- Honest uncertainty: confidence badge and "least reliable for" notes appear next to predictions, not in a footnote.
- Segment-aware by default: results are split by workforce segment so equity gaps are visible.
- Live where it matters: only the swarm wall is real time. Everything else is a static read of stored data.

**Accessibility of the experience.** Keyboard-operable controls, labeled form fields, sufficient contrast, text alternatives for the funnel and heatmap, and a reduced-motion setting for the swarm wall.

## 11. Evaluation and calibration plan

Credibility rests on one claim: the calibrated swarm ranks past rollouts correctly more often than an uncalibrated one. This plan makes that claim testable even at hackathon scale.

**Seeded past rollouts.** Build 6 to 8 "historical experiments", each a pair of UI variants with a known winner and lift. Sources: public conversion-optimization case studies (form length, button labels, field ordering, error messages), adapted to internal-tool contexts, plus hand-crafted pairs with planted usability flaws. Label clearly in the demo that these are seeded and illustrative.

**Procedure**

1. Hold out 2 of the rollouts as a test set before any tuning.
2. Run the uncalibrated swarm (default persona mix) on the other rollouts and record predicted winner and direction.
3. Tune persona mix weights (patience, literacy, language fluency) to maximize agreement, using the tuning set only.
4. Re-run, then evaluate on the held-out rollouts.
5. Report accuracy for uncalibrated, calibrated (tuning set), and calibrated (held-out).

**Reported measures**

| Measure | Meaning |
| --- | --- |
| Winner accuracy | Share of rollouts where the predicted winner matches the known winner |
| Direction accuracy | Share of predicted lifts with the correct sign |
| Rank correlation | Spearman correlation between predicted and known lift |
| Run-to-run stability | Variance in predicted lift across repeated runs of the same variant |

**Honest reporting.** With 6 to 8 rollouts, results are directional, not statistical proof, and the demo says so. The held-out result is shown beside the tuned result to avoid overfitting claims. Where calibration is weak (for example, tasks with heavy visual design effects), the confidence badge says so.

**Additional checks**

- Flaw detection: the swarm must flag the planted flaw in the flawed demo variant and not in the baseline.
- Segment sanity: frontline mobile personas should show higher friction on a desktop-only layout.
- Repeatability: three repeats of one run should agree on the drop-off step.

## 12. 48-hour delivery plan and milestones

The plan deploys first and polishes last, so the Cloud Run requirement is never at risk and the calibration result exists well before the demo.

&#91;embedded content: build plan · 5 phases, 48 hours\]

The highlighted phase is the one that sets Paraverse apart; if time runs short, cut dashboard polish before cutting calibration.

| Phase | Hours | Deliverables |
| --- | --- | --- |
| Foundation | 0 to 6 | GCP trial project and separate no-billing Gemini key, budget alerts, hello-world service on Cloud Run, demo expense app with three versions |
| Swarm engine | 6 to 20 | Persona generator, Playwright agent loop with Gemini, rate-limited queue with checkpointing, first end-to-end run of 5 to 10 agents |
| Analysis and calibration | 20 to 32 | Metrics engine, hours-lost calculator, seeded past rollouts, calibration run with held-out set, confidence score |
| Dashboard and fix loop | 32 to 42 | Swarm wall, funnel, friction heatmap, quotes, fix suggester, re-simulation and delta view, recorded large study |
| Polish and backup video | 42 to 48 | Demo rehearsal, backup video, README and architecture diagram, billing check at $0, submission checklist |

**Cut order if behind**

1. Drop P2 items, then P1 items (accessibility personas, ticket estimator, arbitrary URLs).
2. Reduce the recorded study from 100 or more agents to 50.
3. Replace live heatmap generation with pre-rendered images from the recorded run.
4. Never cut: calibration chart, hours-lost number, fix and re-test, backup video.

## 13. Risks and mitigations

The two risks most likely to hurt the demo are free-tier rate limits and the objection that synthetic users are not real users.

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Free-tier Gemini rate limits throttle the swarm | High | High | Token-bucket queue, backoff, 10 to 20 live agents, recorded large run, per-step checkpointing |
| "Synthetic users are not real users" objection | High | High | Position as a pre-launch rehearsal, show calibration with held-out results, show confidence badge and known weak areas |
| Live demo fails (network, quota, browser) | Medium | High | Replay mode, backup demo video, pre-warmed Cloud Run instance |
| Persona homogeneity (agents behave alike) | Medium | Medium | Trait-driven behavioral rules, enforced diversity, report variance by segment |
| Agent hallucinates UI elements | Medium | Medium | Act only on supplied element IDs, count invalid targets as errors |
| Calibration looks overfit on a tiny set | Medium | Medium | Hold-out set, report both numbers, label results directional |
| Accidental cloud charges | Low | High | Trial account only, separate no-billing Gemini project, budget alerts, no paid Gemini usage |
| Free-tier data is used to improve Google products | Certain | Low | Synthetic data only, state this in the architecture notes |
| Model name or limit changes mid-build | Medium | Low | Single config for model IDs, check AI Studio before each long run |
| Scope creep | High | Medium | P0 list is the contract. P1 and P2 only after the core loop works end to end |

## 14. Judging criteria mapping and demo script

Gen AI is the product's engine, and the calibration layer is the strongest argument for both technical merit and originality.

| Criterion (weight) | How Paraverse answers it | Evidence to show |
| --- | --- | --- |
| Technical merit and Gen AI (40%) | Gemini drives vision-based persona agents that act and explain. Rate-limited parallel execution, structured metrics, calibration pipeline, and Cloud Run deployment | Architecture diagram, live run, step logs behind each metric |
| Scalability and sustainability (within 40%) | Stateless Cloud Run, scale to zero, Cloud Run Jobs fan-out for production, per-run cost far below a failed rollout | Cost-per-run figure and fan-out design |
| Problem alignment and impact (25%) | Targets a real gap: enterprises cannot A/B test on employees. Hours-lost and tickets-avoided in business terms | Hours-lost number on screen, named user roles |
| Innovation and creativity (25%) | Calibrated synthetic workforce, embodied agents on real UI, workforce-aware segments, closed fix loop | Calibration chart, segment equity finding, before and after re-run |
| UX and solution design (10%) | Four-screen flow, swarm wall, plain-language report, accessibility personas, accessible dashboard | Clean walkthrough, accessibility audit result |

**Three-minute demo script**

1. **Hook (20 seconds).** "Your company is rolling out a new expense tool to 20,000 people. Nobody can A/B test on employees, so we built a synthetic workforce."
2. **Setup (20 seconds).** Show the baseline and the redesigned flow, pick segments, press Run.
3. **Swarm run (50 seconds).** The swarm wall fills with agents working through the flow, with think-aloud captions.
4. **Finding (30 seconds).** "Frontline mobile users abandon at step 3. Here is the label, in their words." Show the quote and heatmap.
5. **Impact (20 seconds).** Hours-lost and tickets-avoided numbers on screen.
6. **Trust (20 seconds).** Calibration chart: uncalibrated versus calibrated versus held-out, plus the confidence badge.
7. **Fix (20 seconds).** Apply the top fix, re-run, and show the drop-off disappearing.

**Submission checklist**

- [ ] Public Cloud Run URL working
- [ ] Gemini calls visible in the architecture diagram
- [ ] Calibration chart with real numbers, labeled as seeded
- [ ] Hours-lost number on screen
- [ ] Recorded large study loads in replay mode
- [ ] Backup demo video recorded
- [ ] README with setup steps and cost notes
- [ ] Billing console checked: $0

## 15. Open questions and future roadmap

Four questions need answers before the build starts, and the roadmap shows where the prototype goes if it wins.

**Open questions**

- [ ] Does the hackathon provide sponsored GCP or Gemini credits? If yes, the live swarm can be larger.
- [ ] Which exact Gemini model IDs are available on the free tier today, and what are the real per-minute limits shown in the AI Studio console for this project?
- [ ] Is Cloud Run Jobs allowed within the free trial for the swarm, or should the swarm run locally and only post results to Cloud Run?
- [ ] Is a Gemma model reachable at no cost for the persona generator and calibration judge?

**Roadmap beyond the hackathon**

| Phase | Capability |
| --- | --- |
| Next (P1) | Accessibility personas with keyboard and zoom runs, support-ticket estimator, any public URL as a target |
| Later (P2) | Pull-request integration posting predicted impact, shareable reports, authenticated internal apps via customer-provided test accounts |
| Production | Cloud Run Jobs fan-out for thousands of agents, learning loop that feeds real A/B or pilot results back into calibration, per-organization persona libraries, role-based access and audit logs |
