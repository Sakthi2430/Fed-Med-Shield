# Security Specification — FedMed Shield (Federated Healthcare Platform)

## 1. Data Invariants
1. **Zero-PHI Outbound Invariant**: Individual patient records never leave the local hospital node enclave and are never stored in Firestore. Only differentially private gradient deltas (`GradientUpdate` with `phiScanPassed == true`) and aggregate node telemetry (`HospitalNode`) are persisted.
2. **Role Integrity Invariant**: Regular users cannot self-assign `role: 'admin'` on `/users/{uid}` or create entries in `/admins/{uid}`. Admin privileges are verified exclusively via `/admins/{uid}` existence or the bootstrapped verified admin email (`sgkan24@gmail.com` with `email_verified == true`).
3. **PII Isolation Invariant**: User email addresses reside exclusively in `/users/{uid}/private/info`, readable and writable only by `isOwner(uid)` or `isAdmin()`.
4. **Node-Update Binding Invariant**: A `GradientUpdate` cannot be created unless its referenced `nodeId` exists in `/hospital_nodes/{nodeId}` with `status == 'active'`, `submittedByUid == request.auth.uid`, and `phiScanPassed == true`.
5. **Terminal State & Audit Immutability Invariant**: `AuditLog` documents are strictly append-only (no updates or deletes). Aggregated `TrainingRound` and `GradientUpdate` records cannot be downgraded by non-admin users.
6. **Temporal & Key Whitelisting Invariant**: All `createdAt` and `updatedAt` fields must equal `request.time`. All writes must pass strict `keys().hasAll(...)` and `keys().hasOnly(...)` checks plus `isValidId()` path validation.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Privilege Escalation on User Create**: `POST /users/attacker` with `{ role: 'admin', ... }` -> MUST fail (`PERMISSION_DENIED`).
2. **Role Promotion via Profile Update**: `PATCH /users/user1` with `{ role: 'admin' }` by `user1` -> MUST fail (`PERMISSION_DENIED`).
3. **Shadow Ghost Field Injection**: `POST /hospital_nodes/node_x` with valid fields + `isVerifiedByAdmin: true` -> MUST fail (`PERMISSION_DENIED`).
4. **Unverified Email Spoofing**: Request with `email: 'sgkan24@gmail.com'` and `email_verified: false` -> MUST fail (`PERMISSION_DENIED`).
5. **Cross-User PII Read**: `GET /users/victim/private/info` by `attacker` -> MUST fail (`PERMISSION_DENIED`).
6. **Blanket User List Scraping**: `LIST /users` by non-admin user -> MUST fail (`PERMISSION_DENIED`).
7. **Orphaned Gradient Submission**: `POST /gradient_updates/u1` referencing non-existent `nodeId: 'ghost_node'` -> MUST fail (`PERMISSION_DENIED`).
8. **Unscanned PHI Payload Bypass**: `POST /gradient_updates/u2` with `phiScanPassed: false` -> MUST fail (`PERMISSION_DENIED`).
9. **Client Timestamp Forgery**: `POST /gradient_updates/u3` with `createdAt: '2020-01-01T00:00:00Z'` instead of `request.time` -> MUST fail (`PERMISSION_DENIED`).
10. **Path ID Poisoning (1KB junk ID)**: `POST /hospital_nodes/<1000 chars>` -> MUST fail (`PERMISSION_DENIED`).
11. **Non-Admin Global Round Manipulation**: `POST /training_rounds/r99` by regular user -> MUST fail (`PERMISSION_DENIED`).
12. **Audit Log Tampering**: `PATCH` or `DELETE /audit_logs/log1` even by an admin -> MUST fail (`PERMISSION_DENIED`).
