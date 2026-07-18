# Project Principles

- Prevent predictable failure before optimizing delivery speed.
- Preserve raw inputs and record provenance.
- Prefer evidence over confidence or memory.
- Make risky changes reversible.
- Keep one owner for every fact.
- Automate repeated checks after the workflow is understood.
- Improve known-good results; do not replace them without a stronger gate.
- Convert reproducible failures into permanent regression gates.
- Require every feature to preserve older required gates and add a focused gate.
- Critique claims with evidence; accept correct criticism without defending a mistake.
- Consider scalable alternatives before implementing the first idea.
- Choose tools by problem, constraints and evidence; no technology is universally best.
- Use small reversible pilots to discover unknown risk; prevention must not become endless preparation.
- Keep routine handoff self-contained in this project and pin the global standard provenance.
- Treat logs as diagnostics, not correctness proof.
- Route reusable tools through candidate review instead of silently promoting them.

## Domain Specialization

- Reflection answers are sensitive personal data. Keep them on-device by default and never send them to a server without an explicit later decision.
- Question edits affect future check-ins only. Saved history keeps a question snapshot so later CRUD cannot rewrite the meaning of an old answer.
- A browser database is convenient storage, not a backup. Recovery requires a verified exported backup file kept outside the browser.
- Share packages contain reusable definitions by default, not private nightly answers.
- Scores are navigation aids, not psychological diagnoses or moral verdicts. Preserve the owner's notes and context alongside every summary.
