---
title: "Inventory Draft: Career Entries"
status: in-progress
created: 2026-08-31
updated: 2026-08-31
---

# Inventory Draft: Career Entries

Working file for the career inventory — the content that fills the JSON source of truth. Format validated against the SNCF entry; see `addendum.md` §Format Validation.

**Field set per project:**

```
client         the end client (star)
project        name or short description
company        intermediate consultancy (attribute, not a body)
role           Thomas's role on the engagement
built          short description of what he built
team_size      integer
notable        problem -> constraint -> decision, 100-150 words of prose
skills         relation to skills/technologies (condensing dust)
```

**Before drafting each entry, answer:** what did you argue for, and what did you argue against? The decision does not reliably surface from a description of the work.

---

## SNCF — Client referential, MDM replacement

**Status:** drafted, approved in conversation

- **Client:** SNCF — French national rail
- **Project:** Client referential — MDM replacement
- **Company:** _(intermediate — to fill)_
- **Role:** Technical lead
- **Team:** 11 (6 developers, 2 QA, 2 lead developers, myself)
- **Built:** Replaced a commercial Oracle MDM at the core of SNCF's client referential with a Spring Boot application, alongside a Java and Cloudera upgrade of the surrounding platform.

**Notable:**

> The Oracle MDM cost twice: an expensive licence, and a team employed full-time to correct the data it produced. Replacing it meant rebuilding a mature product's behaviour with no specification to work from — documentation was absent or years stale, so the incumbent's real rules had to be recovered from the system itself.
>
> The house standard was Spring on a dedicated external Tomcat, on ageing on-premise infrastructure. I argued for Spring Boot with embedded Tomcat instead — the better fit, and the furthest the client would go. With a mostly junior team on a critical system, a from-scratch rebuild on a current stack was also the one chance they'd get to learn one.

**Skills / technologies:** Java, Spring Boot, Tomcat, Oracle, Cloudera, MDM, technical leadership, code review, mentoring

**Responsibilities (source material, not for publication):** most technical and business design, architecture, code reviews, junior developer growth.

---

## SNCF — Platform upgrade programme

**Status:** not drafted — second project from the same engagement

Raw material available: major Java upgrades, Cloudera upgrades, significant accumulated technical debt, ageing on-premise stack, dated supervision tooling.

**Open:** what was argued for and against here? The decision is not yet identified.

---

## Remaining entries

Not yet drafted. Roughly 8 more projects across ~5-6 clients and 2 intermediate companies.

---

## Material deliberately excluded

**Client relationship friction (SNCF).** The client was demanding while deflecting responsibility for problems. Excluded from publication: a reader cannot verify it, both sides of such an account always exist, and published criticism of a named former client reflects on the author rather than the client. Retained here only so the decision is not silently revisited.
