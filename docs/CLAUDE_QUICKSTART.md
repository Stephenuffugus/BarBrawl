# BarBrawl — Claude Code Quickstart

## Files in this package
- `BARBRAWL_SPEC.md` — The complete design and technical specification. Read this first.
- `barbrawl-v6.jsx` — Working React prototype. Source of truth for content, UX, and system behavior.
- `README.md` — This file.

## How to use with Claude Code

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Create your project folder
```bash
mkdir barbrawl
cd barbrawl
```

### 3. Drop these files in
- Put `BARBRAWL_SPEC.md` in the root
- Put `barbrawl-v6.jsx` in `docs/prototype/barbrawl-v6.jsx`

### 4. Start Claude Code
```bash
claude
```

### 5. Give it this opening prompt

```
Read BARBRAWL_SPEC.md completely before doing anything else. That document
is the source of truth for everything we're building.

Also review docs/prototype/barbrawl-v6.jsx — it's a working React prototype
that demonstrates the core gameplay, skill trees, and content. Use it as
reference for behavior and UX, but we're building the production version
in React Native + Expo.

Once you've read both:

1. Confirm you understand the non-negotiable principles in Section 1
2. Summarize the prioritized build order from Section 12
3. Start Phase 0 (Project Setup)

Work one phase at a time. Ask before moving to the next phase. Show me
diffs before applying changes. If anything in my requests conflicts with
the non-negotiable principles, flag it and ask before proceeding.
```

### 6. Work phase by phase

Claude Code works best with focused, sequential tasks. Don't ask it to "build the whole app." Let it complete Phase 0, verify it runs, then move to Phase 1. And so on.

When you finish a phase, prompt:
```
Phase X is complete. Summarize what's done, what's tested, and what I
should verify manually. Then start Phase [X+1].
```

### 7. When you hit design decisions

If Claude Code asks "should I do A or B?" — check the spec first. If the spec doesn't answer it, make the call and tell Claude to update the spec with the decision so future sessions stay consistent.

## Key reminders

- **The spec is law.** Non-negotiables in Section 1 cannot be violated.
- **Server-authoritative always.** Never trust the client.
- **Cosmetics-only monetization.** Forever.
- **The Steady class is equal to the others.** Not a joke, not a filler.

## If something breaks

When Claude Code produces something that doesn't match your expectations:
1. Don't just tell it "fix this" — point to the specific section of the spec that defines the correct behavior.
2. Ask it to explain its reasoning before changing code.
3. If the spec is ambiguous, clarify the spec first, then have Claude Code implement the clarified version.

Good luck. Build something great.
