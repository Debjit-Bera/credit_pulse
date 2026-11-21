# CreditPulse Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. Every document in `/users/{userId}` and all nested subcollections belongs exclusively to `userId` and requires `request.auth != null && request.auth.uid == userId`.
2. All standard write operations require `request.auth.token.email_verified == true`.
3. Private PII and financial metrics (`email`, `fullName`, `monthlyIncome`, `creditCardBalance`) live in `/users/{userId}/private/financial_profile` and are never exposed to other users or blanket list queries.
4. All path document IDs must satisfy `^[a-zA-Z0-9_-]+$` and length `<= 128` on single-document operations (`get`, `create`, `update`, `delete`).
5. Every `create` validates exact required and allowed keys (`hasAll` + `hasOnly`), type/range limits, and server timestamp (`createdAt == request.time`).
6. Every `update` invokes its `isValid*` helper, blocks modification of immutable fields (`userId`, `uid`, `createdAt`), enforces `updatedAt == request.time`, and restricts modified keys via `affectedKeys().hasOnly(...)`.
7. Bounded arrays (`failedCheckKeys`, `recommendations`, `completedTaskIds`) enforce strict `.size()` limits and index-0 string validation.
8. Every `allow list` rule explicitly enforces `resource.data.userId == request.auth.uid` without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: `request.auth == null` reading `/users/userA/private/financial_profile` -> DENIED.
2. **Cross-Tenant Read**: `userB` attempting `get` on `/users/userA/creditAssessments/abc` -> DENIED.
3. **Cross-Tenant List Scraping**: `userB` querying `/users/userA/emiCalculations` -> DENIED.
4. **UID Spoofing on Create**: `userA` creating `/users/userA/creditAssessments/a1` with `userId: "userB"` -> DENIED.
5. **Shadow / Ghost Field Injection**: `userA` creating `/users/userA` with extra field `isAdmin: true` -> DENIED (`hasOnly` rejects).
6. **Unverified Email Write**: `userA` with `email_verified: false` creating `/users/userA/emiCalculations/c1` -> DENIED.
7. **Timestamp Forgery on Create**: `userA` creating `/users/userA/chatMessages/m1` with backdated `createdAt` (`!= request.time`) -> DENIED.
8. **Immutable Field Mutation**: `userA` updating `/users/userA/improvementPlans/p1` to change `createdAt` or `userId` -> DENIED.
9. **Path ID Poisoning**: `userA` writing `/users/userA/emiCalculations/bad$id..` or 200-char ID -> DENIED (`isValidId`).
10. **Oversized String / Resource Poisoning**: `userA` writing a 20,000-char string into `chatMessages.content` -> DENIED (`.size() <= 8000`).
11. **Type Poisoning on Update**: `userA` updating `financial_profile.monthlyIncome` to a string `"5000"` -> DENIED (`isValidFinancialProfile`).
12. **Unbounded Array Overflow**: `userA` creating `loanAnalyses` with 50 items in `failedCheckKeys` or non-string item at `[0]` -> DENIED.
