# Knowledge to Output Flow

## 1. Purpose

This document explains how the life coach system should move from raw user input to final user-facing output.

It connects five layers of the current project:
- skill routing
- knowledge retrieval
- theory grounding
- case grounding
- output shaping and safety checks

The goal is to make the full chain understandable and maintainable, so future prompt, retrieval, and product updates stay aligned.

## 2. Current source of truth

### 2.1 Theory documents
- `docs/life-coach-response-theory-basis.md`
- `docs/expert-knowledge-base-and-domain-finetuning-corpus.md`
- `docs/emotion-and-issue-keyword-workflow.md`

These files define:
- analysis order
- intervention sequence
- tone constraints
- how emotion and issue type should be recognized before answering

### 2.2 Structured knowledge assets
Stored under:
- `packages/lifecoach-workspace/content/knowledge/frameworks/`
- `packages/lifecoach-workspace/content/knowledge/prompts/`
- `packages/lifecoach-workspace/content/knowledge/cases/`
- `packages/lifecoach-workspace/content/knowledge/safety/`

Each retrievable unit is a pair:
- `<slug>.json`
- `<slug>.md`

### 2.3 Runtime logic
- Skill routing: `packages/lifecoach-core/src/router/skill_router.js`
- Knowledge retrieval: `packages/lifecoach-core/src/retrieval/knowledge_retriever.js`

### 2.4 Output design reference
- `docs/life-coach-output-design.md`

This file is the bridge between knowledge assets and final response behavior.

## 3. End-to-end pipeline

The current intended pipeline is:

1. User sends input
2. System first infers primary emotion, current state, and real intent
3. System maps that understanding into the right product logic path
4. System routes to the most likely primary skill
5. System retrieves relevant knowledge blocks
6. System performs hidden analysis using theory and prompt assets
7. System references similar case patterns for natural language shaping
8. System applies safety boundaries if needed
9. System produces the final visible response

## 4. Stage 1: user input

Input may include:
- free text
- short emotional statements
- conflict descriptions
- long narrative
- multimodal summaries in later runtime stages

At this stage, the raw input still contains mixed signals:
- emotional state
- issue type
- desired help type
- urgency level
- possible safety flags

## 5. Stage 2: skill routing

Skill routing happens in:
- `packages/lifecoach-core/src/router/skill_router.js`

Current routing logic:
- read all `skills/<skill>/route.json`
- score each skill by keyword hits, sceneTag hits, and route priority
- exclude blocked routes using `excludeKeywords`
- choose one `primarySkill`

The output of this stage is not the final answer.
It is only the first narrowing step that determines which style of help is most likely needed.

### Why this matters
The primary skill affects later knowledge scoring because many knowledge blocks declare:
- `recommendedSkills`

So routing is the first gate that shapes retrieval.

## 6. Stage 3: knowledge retrieval

Knowledge retrieval happens in:
- `packages/lifecoach-core/src/retrieval/knowledge_retriever.js`

Current retrieval logic:
- scan all knowledge buckets under `content/knowledge/`
- load every `.json` metadata file
- load paired `.md` content when present
- score matches using:
  - `scenes`
  - `keywords`
  - `recommendedSkills`
  - optional workflow priorities

### Current scoring behavior
The retriever now prioritizes semantic hits:
- scene hit: `+8`
- keyword hit: `+10`
- skill hit: only adds value when there is already a scene or keyword match
- workflow priority may add extra score in special flows

This means knowledge retrieval is now less likely to return false positives based only on broad skill matching.

## 7. Stage 4: what each knowledge bucket does

### 7.1 frameworks
Path:
- `packages/lifecoach-workspace/content/knowledge/frameworks/`

Role:
- provide reusable coaching logic
- define response order
- stabilize how the system explains patterns

Examples:
- `diagnostic-onion-001`
- `rebuild-pyramid-001`
- `response-pyramid-001`
- `sociology-reframe-001`

Use frameworks when the system needs:
- analysis structure
- intervention order
- a stable explanation lens

### 7.2 prompts
Path:
- `packages/lifecoach-workspace/content/knowledge/prompts/`

Role:
- shape hidden reasoning and output organization
- control how the system turns understanding into phrasing
- reduce robotic responses by constraining flow rather than forcing scripts

Examples:
- `onion-analysis-prompt-001`
- `emotion-keyword-workflow-001`

Use prompt assets when the system needs:
- response ordering
- backstage analysis steps
- tone and phrasing constraints
- a rule for when to explain versus when to contain

### 7.3 cases
Path:
- `packages/lifecoach-workspace/content/knowledge/cases/`

Role:
- match real-life situation patterns
- help the system sound more grounded and less generic
- suggest plausible intervention direction

Examples:
- `workplace-cannot-say-no-001`
- `family-love-as-debt-001`
- `intimate-emotional-dependence-001`

Use case assets when the system needs:
- realistic pattern recognition
- more human phrasing
- scenario-specific intervention hints

### 7.4 safety
Path:
- `packages/lifecoach-workspace/content/knowledge/safety/`

Role:
- override normal coaching flow when risk is high
- prevent dependency reinforcement or unsafe escalation
- constrain what the system may or may not say

Examples:
- `coaching-boundary-001`
- `dependency-escalation-001`
- `family-emotional-blackmail-boundary-001`
- `relationship-control-and-cold-violence-001`

Use safety assets when the system sees:
- self-harm or extreme hopelessness cues
- coercion and control patterns
- dependency escalation
- abuse-like dynamics
- requests that push the model into pseudo-clinical certainty

## 8. Stage 5: hidden analysis before output

Before writing the visible answer, the system should internally combine:
- routed primary skill
- retrieved frameworks
- retrieved prompts
- retrieved cases
- retrieved safety assets when present

The hidden analysis order should follow `docs/life-coach-output-design.md`:

1. identify primary emotion
2. identify scene / issue domain
3. identify trigger and repeated pattern
4. decide whether the user needs containment, explanation, boundary, or action
5. decide the smallest useful analysis layer
6. safety-check the planned response

This stage should remain mostly invisible in the final output.

## 9. Stage 6: shaping the visible response

The visible response should generally follow this form:

### Opening
- receive the user’s experience
- show contact with what hurts now
- avoid scripted empathy

### Middle
- give one or two helpful layers of clarification
- use theory quietly, not performatively
- prefer plain language over technical labels

### Ending
- narrow to one question, one frame, one action, or one boundary reminder
- do not give a long checklist unless the situation truly calls for it

## 10. How theory, prompts, and cases should combine

The intended relationship is:

- **Theory docs** define the deep logic
- **Framework assets** package the deep logic into retrievable coaching structures
- **Prompt assets** define how analysis is turned into response flow
- **Case assets** provide realism and pattern grounding
- **Safety assets** define the outer boundary of what the system may do

A simple way to think about it:
- frameworks decide **how to think**
- prompts decide **how to organize the answer**
- cases decide **how to sound grounded in real situations**
- safety decides **what must not be crossed**

## 11. Example flow

Example user input:
> “他一句话就能影响我一天，我感觉没有他不行。”

Expected chain:

1. **Skill routing**
   - likely routes to `emotional-debrief`

2. **Knowledge retrieval**
   - likely retrieves:
     - `case-intimate-emotional-dependence-001`
     - `prompt-emotion-keyword-workflow-001`
     - `framework-response-pyramid-001`
     - possibly `safety-dependency-escalation-001`

3. **Hidden analysis**
   - primary emotion: panic / dependence / instability
   - domain: intimate relationship
   - immediate need: containment first, insight second
   - risk: dependency escalation check required

4. **Visible response**
   - receive the pain
   - gently name that emotional stability has become over-bound to the partner
   - avoid romanticizing dependence
   - end with one small step toward recovering an internal or external support point

## 12. Maintenance rules

When adding future assets:
- do not dump long theory directly into retrieval
- split by retrievable purpose
- keep metadata aligned with runtime scoring
- prefer small reusable blocks over giant documents
- keep case assets realistic but non-diagnostic
- keep prompt assets backstage-oriented, not end-user-template-heavy
- keep safety assets strict and explicit

## 13. Recommended next evolution

Good next steps after this document:
- add a lightweight domain boost in retrieval for family / workplace / intimate relationship language
- define a more explicit safety-first branch before deep analysis
- add tests that verify expected retrieval hits for representative Chinese phrases
- connect prompt assets more directly to the runtime response composer

## 14. One-line summary

Route first, retrieve the right mix of theory and cases second, then generate a safe and human-sounding response with the smallest useful next step.
