# Security Specification

## Data Invariants
- Users can only read/write their own data, or data they are authorized to access.
- For this simple app, assuming all users are authenticated and have access.

## The "Dirty Dozen" Payloads
(Assuming these should be PERMISSION_DENIED if not authorized)
1. Read `users` without auth.
2. Read `assessments` without auth.
...

## The Test Runner
(Would be `firestore.rules.test.ts`)
