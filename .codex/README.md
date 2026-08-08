# Quote Vault multi-agent setup

This project defines six Codex agents under `.codex/agents/`:

- `architect`: maps cross-cutting behavior and produces an implementation plan.
- `firebase_specialist`: reviews Firebase Auth, Firestore, rules, indexes, and ownership.
- `frontend_specialist`: reviews the vanilla JavaScript UI, state, accessibility, and localization.
- `backend_specialist`: reviews Express endpoints and server-side integrations.
- `implementer`: applies the consolidated plan and is the only custom agent intended to edit application code.
- `qa_reviewer`: independently reviews the completed change.

Codex reads the repository-level `AGENTS.md` and uses these roles when a task
crosses project boundaries or benefits from independent investigation.

## Example prompts

```text
Investigate this authentication bug. Delegate Firebase analysis to
firebase_specialist and UI-flow analysis to frontend_specialist in parallel.
Wait for both, consolidate the plan, have implementer make the change, and ask
qa_reviewer for a final independent review.
```

```text
Add a transcript endpoint option. Have backend_specialist trace the endpoint and
frontend_specialist trace its caller. Wait for both before implementation, keep
one writer, then run qa_reviewer.
```

```text
Plan this refactor with architect. Do not modify code until the affected modules,
file ownership, migration risks, and verification plan are clear.
```

For explicit delegation in the IDE or app, phrases such as `use subagents`,
`delegate in parallel`, and `wait for all agents before implementing` make the
desired orchestration unambiguous.
