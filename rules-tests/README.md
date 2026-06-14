# Firestore security-rules tests

Proves `firestore.rules` (Phase 3 tenant isolation) both directions: legitimate
access works (no lockout) AND cross-shop / privilege access is denied (no leak).

## Run

The Firestore emulator requires **JDK 21+** (`brew install openjdk@21`). It's
keg-only, so point `JAVA_HOME` at it when launching:

```bash
# terminal 1 — start the emulator (fake project id, never touches prod):
JAVA_HOME="/opt/homebrew/opt/openjdk@21" PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" \
  firebase emulators:start --only firestore --project demo-rules-test

# terminal 2 — run the suite:
node rules-tests/firestore-rules.test.cjs
```

Exit code 0 = all pass. The suite re-reads `firestore.rules` from disk each run,
so edit the rules and re-run to re-prove. Expect `PERMISSION_DENIED` log lines
during the deny tests — those are the emulator confirming the deny worked (each
is paired with a ✅).

Last run: **28 passed, 0 failed** (2026-06-14).
