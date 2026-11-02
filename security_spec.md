# Security Specification — SUMA+ ACADEMY

## 1. Data Invariants
1. **Master Gate & Relational Integrity**: Every `Lesson` must reference an existing `Category` (`exists(/databases/$(database)/documents/categories/$(incoming().categoryId))`).
2. **Identity & Role Enforcement**: Only verified administrators (`isAdmin()`) may create, update, or delete `categories` and `lessons`.
3. **PII Isolation**: `/users/{userId}` contains `email` and `displayName`, so read/write access is strictly restricted to `isOwner(userId)` or `isAdmin()`.
4. **Query Enforcer**: `allow list` on `categories` and `lessons` enforces `resource.data.isPublished == true` (or `resource.data.name.size() > 0`), and `allow list` on `quizAttempts` enforces `resource.data.userId == request.auth.uid`.
5. **Temporal & Immutable Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on updates; `updatedAt` must equal `request.time` on updates.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Category**: `{ "id": "cat-1", "name": "IA", "isSuperAdmin": true }` -> Rejected by `.keys().hasOnly()`.
2. **Oversized String DoW on Lesson**: `{ "title": "<2000 chars>" }` -> Rejected by `data.title.size() <= 140`.
3. **ID Poisoning on Path**: `/categories/invalid$id!@#` -> Rejected by `isValidId(categoryId)`.
4. **Orphaned Lesson Creation**: `categoryId: "non-existent-cat"` -> Rejected by `exists(/databases/$(database)/documents/categories/$(incoming().categoryId))`.
5. **Unverified Admin Email Spoof**: `request.auth.token.email == "chaconomar411@gmail.com"` with `email_verified == false` -> Rejected by `request.auth.token.email_verified == true`.
6. **PII Blanket Read on `/users/{userId}`**: Authenticated user `uid-A` reading `/users/uid-B` -> Rejected by `isOwner(userId) || isAdmin()`.
7. **Unauthorized Student Category Creation**: Non-admin student attempting `create` on `/categories/cat-2` -> Rejected by `isAdmin()`.
8. **Immutable Field Mutation**: Updating `createdAt` or `authorUid` on `/lessons/{lessonId}` -> Rejected by `incoming().createdAt == existing().createdAt && incoming().authorUid == existing().authorUid`.
9. **Client Timestamp Forgery**: Providing past timestamp for `createdAt` -> Rejected by `incoming().createdAt == request.time`.
10. **Terminal State Mutation on `quizAttempts`**: Attempting to update a `completed` quiz attempt -> Rejected by terminal state lock (`existing().status != 'completed'`).
11. **Unbounded Array Poisoning**: Passing 500 items in `completedLessonIds` -> Rejected by `data.completedLessonIds.size() <= 100`.
12. **Cross-User Quiz Attempt Spoofing**: Creating a `QuizAttempt` with `userId != request.auth.uid` -> Rejected by `data.userId == request.auth.uid`.
