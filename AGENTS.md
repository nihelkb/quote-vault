# Quote Vault agent instructions

## Project map

- The frontend is a vanilla JavaScript application built with Vite. Do not assume React, Vue, or another component framework.
- `src/features/` owns feature-level UI and flows.
- `src/components/` and `src/shared/components/` own reusable UI.
- `src/services/` owns Firebase-backed data access and application services.
- `src/config/firebase.js` owns Firebase client initialization.
- `src/core/` owns routing, events, state, and component infrastructure.
- `src/locales/` owns the English and Spanish translations. Keep both locales aligned when user-facing copy changes.
- `backend/` is a separate Express service for transcript and video-metadata endpoints.

## Security boundaries

- Never read, print, copy, or modify `.env` or `backend/.env` unless the user explicitly requests it. Use `.env.example` and `backend/.env.example` to understand variable names.
- Never place Groq, Firebase Admin, service-account, or other server secrets in browser code.
- Treat Firebase web configuration values as identifiers, not authorization. Enforce data isolation through authentication and Firestore rules.
- When data access changes, verify ownership checks, unauthenticated behavior, and whether Firestore rules or indexes must also change.

## Multi-agent workflow

Use subagents when a task spans two or more project areas, has an unclear failure mode, or benefits from independent security or regression review. Do not delegate trivial or tightly coupled single-file changes.

1. Delegate independent investigation to the narrowest applicable read-only specialists.
2. Ask specialists to return evidence, affected files, risks, and a proposed verification plan.
3. Wait for their results and consolidate one implementation plan in the primary thread.
4. Delegate implementation to `implementer`, or implement in the primary thread. Keep a single writer for overlapping files.
5. After implementation, delegate an independent final review to `qa_reviewer` when the change is non-trivial.
6. Resolve review findings before reporting completion.

Never run multiple write-capable agents against overlapping files. Parallelize exploration and review; serialize dependent implementation work.

## Specialist routing

- Use `architect` for cross-cutting changes, dependency mapping, refactors, and file-ownership plans.
- Use `firebase_specialist` for Firebase Auth, Firestore queries, data ownership, configuration, rules, indexes, and Firebase-specific failure modes.
- Use `frontend_specialist` for UI flows, components, state transitions, accessibility, responsive behavior, and translations.
- Use `backend_specialist` for `backend/`, Express endpoints, CORS, Groq integration, YouTube metadata, transcripts, and server-side secret handling.
- Use `implementer` only after the relevant behavior and file scope are understood.
- Use `qa_reviewer` for correctness, security, regression, missing-test, and maintainability review after a change.

## Change discipline

- Preserve existing user changes and keep unrelated files untouched.
- Prefer the smallest change that fully solves the requested behavior.
- Follow the existing ES module and class/service conventions unless the task explicitly includes a refactor.
- Do not add dependencies without explaining why the existing stack is insufficient.
- Update documentation and both locale files when behavior or user-facing text changes.

## Verification

- Frontend build: `npm run build`
- Backend syntax check: `node --check backend/server.js`
- The repository currently has no configured lint or automated test script. Do not claim those checks ran unless such scripts are added.
- For UI work, describe the manual flow that still needs browser verification when browser tooling is unavailable.
- For Firebase work, list any console-side rules, indexes, providers, or environment configuration that cannot be verified locally.
