# Claude.md - GIPC ERM Development Guide

**Last Updated:** January 2026
**Project Phase:** Phase A Complete, Phase B In Planning
**For:** Claude AI Assistant (all iterations and contexts)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Current Status & Phases](#current-status--phases)
4. [Code Standards & Patterns](#code-standards--patterns)
5. [Database & Schema](#database--schema)
6. [Access Control Model](#access-control-model)
7. [Governance & Auditing](#governance--auditing)
8. [How to Ask for Help](#how-to-ask-for-help)
9. [Critical Constraints](#critical-constraints)
10. [Known Issues & Gaps](#known-issues--gaps)

---

## Project Overview

### What Is GIPC ERM?

**Purpose:** Enterprise Records Management system for Ghana Investment Promotion Centre (GIPC)
- Manage investor records with fine-grained access control
- Track investment projects and legal proceedings
- Maintain audit trails for compliance
- Enable governance-first workflows with approval processes

**Users:**
- **Admin:** System administrators, full access
- **Manager:** Department heads, can approve access requests
- **Records Manager:** Can classify, lock, archive records
- **Staff:** Can read/create records, request access to others' records

**Scale:**
- ~1,000 investors
- ~5,000 investment records
- 50-100 concurrent users
- Compliance-critical (investor trust)

### Why It Matters

GIPC needs a system they can trust. Every decision (access grant, record change, approval) must be:
- ✅ Auditable (who did what, when, why)
- ✅ Immutable (can't be changed without trace)
- ✅ Enforceable (not bypassable with WhatsApp)
- ✅ Transparent (users can see why they're denied)

---

## Architecture & Tech Stack

### Frontend
```
Next.js 14 (app router)
├─ TypeScript (strict mode)
├─ React 18+ with hooks
├─ TailwindCSS (styling)
├─ Lucide React (icons)
├─ NextAuth.js (authentication)
└─ Form handling: React Hook Form + Zod
```

### Backend
```
Next.js API Routes
├─ TypeScript
├─ getServerSession() for auth
├─ Custom ACS (Access Control Service)
├─ Custom AuditLog service
├─ Error handling middleware
└─ Request validation (Zod)
```

### Database
```
PostgreSQL
├─ Prisma ORM (schema-driven)
├─ JSONB for flexible metadata
├─ GIN indexing on metadata
├─ Audit trail (immutable append-only)
└─ Foreign keys enforced
```

### Key Services
```
ACS (lib/acs.ts)
├─ Permission evaluation
├─ Role-based access control
└─ Record/company-level access checks

AuditLog (services/auditLog.ts)
├─ Immutable change tracking
├─ Deep diff recording
└─ Compliance reporting

Metadata (lib/metadata/)
├─ Field registry (canonical definition)
├─ Zod validation schemas
└─ Immutability rules
```

---

## Current Status & Phases

### Phase A: Metadata Layer Hardening ✅ COMPLETE

**What was done:**
- ✅ UUID metadata keys → named keys (queryable)
- ✅ Server-side validation (Zod schema)
- ✅ Deep diff auditing (before/after values)
- ✅ Immutability enforcement (per-field, per-status)
- ✅ Access re-evaluation triggers (on sensitive changes)

**Outcome:** Production-ready metadata foundation

**Key files:**
- `lib/metadata/fieldRegistry.ts` - All ~50 fields defined
- `lib/metadata/validation.ts` - Zod schemas (auto-generated)
- `services/auditLog.ts` - Audit logging service
- `schema.prisma` - Database schema with JSONB

---

### Phase B: Governance Hardening 🚧 PLANNING

**What needs to be done:**
- [ ] AccessRequest workflow (request → approve → grant)
- [ ] RecordAccess + CompanyAccess tables (fine-grained access)
- [ ] Approval SLA enforcement (with escalation)
- [ ] Admin approval dashboard (queue management)
- [ ] Record page redesign (6 zones with governance)
- [ ] Access expiry enforcement (automatic revocation)
- [ ] Request deduplication (spam prevention)

**Why it matters:** Enables governance-first workflows that GIPC requires

**Timeline:** Starting after Phase A completion (Feb 2026)

**Blockers to fix before starting:**
- See [Known Issues & Gaps](#known-issues--gaps)

---

### Phase C: Scaling & Operations 🔮 FUTURE

**What would follow Phase B:**
- Performance optimization (caching, query optimization)
- Bulk operations (import/export)
- Advanced reporting (compliance metrics)
- Notifications (email, in-app)
- Multi-tenant support (if GIPC wants to white-label)

---

## Code Standards & Patterns

### File Organization

```
app/
├─ api/
│  ├─ records/
│  │  └─ route.ts (CRUD endpoints)
│  ├─ access-requests/
│  │  └─ route.ts (Approval workflow)
│  ├─ projects/
│  │  └─ route.ts (Project management)
│  └─ admin/
│     └─ route.ts (Admin-only endpoints)
├─ records/
│  └─ [id]/
│     └─ page.tsx (Record details page)
└─ layout.tsx (Root layout with auth)

lib/
├─ acs.ts (Access Control Service)
├─ db.ts (Prisma client)
├─ types.ts (Shared TypeScript types)
├─ errors.ts (Custom error classes)
├─ validation.ts (Global validators)
└─ metadata/
   ├─ fieldRegistry.ts (Canonical field definitions)
   └─ validation.ts (Metadata Zod schemas)

services/
├─ auditLog.ts (Immutable change tracking)
├─ recordService.ts (Record business logic)
├─ accessRequestService.ts (Request approval workflow)
└─ notificationService.ts (Placeholder for Phase C)

db/
├─ schema.prisma (Database schema - source of truth)
├─ seed_governance.ts (Development seed data)
└─ migrations/ (Prisma migrations)
```

### Code Style Conventions

**TypeScript:**
- Strict mode always (`"strict": true`)
- Explicit return types on all functions
- No `any` type (use `unknown` if necessary, then narrow)
- Interface over type for object shapes

```typescript
// ✅ GOOD
async function getRecord(id: string): Promise<Record | null> {
  const record = await db.record.findUnique({ where: { id } });
  return record;
}

// ❌ BAD
async function getRecord(id) {
  return db.record.findUnique({ where: { id } });
}
```

**Naming:**
- Services: `XxxService` or `Xxx` (e.g., `RecordService`, `ACS`)
- Utilities: `xxxUtils` or just `xxx` (e.g., `dateUtils`, `validation`)
- Constants: `UPPER_CASE` (e.g., `IMMUTABLE_FIELDS_WHEN_REGISTERED`)
- Booleans: `isXxx`, `hasXxx`, `canXxx`, `shouldXxx`

```typescript
// ✅ GOOD
const canApprove = await ACS.canApproveAccessRequests(userId);
const IMMUTABLE_FIELDS = ['classification', 'investmentAmount'];
const isExpired = access.expiresAt && access.expiresAt < new Date();

// ❌ BAD
const canApprove = user.role === 'ADMIN';
const fields = ['classification', 'investmentAmount'];
const expired = access.expiresAt < Date.now();
```

**Functions:**
- Single responsibility (one reason to change)
- Pure functions when possible (no side effects)
- Async/await (not .then() chains)
- Explicit error handling (no silent failures)

```typescript
// ✅ GOOD
async function validateAndCreateRecord(
  input: unknown,
  userId: string
): Promise<Record> {
  const validated = recordSchema.parse(input);
  const canCreate = await ACS.canCreateRecord(userId);
  if (!canCreate) throw new PermissionError('Cannot create records');
  
  const record = await db.record.create({ data: validated });
  await AuditLog.create({
    action: 'RECORD_CREATED',
    recordId: record.id,
    userId
  });
  return record;
}

// ❌ BAD
async function create(input, userId) {
  const record = await db.record.create({ data: input });
  return record;
}
```

### Error Handling

**Always throw meaningful errors, never silent failures:**

```typescript
// ✅ GOOD
async function getRecord(id: string): Promise<Record> {
  const record = await db.record.findUnique({ where: { id } });
  if (!record) {
    logger.warn(`Record not found: ${id}`);
    throw new NotFoundError('Record', id);
  }
  return record;
}

// ❌ BAD
async function getRecord(id: string): Promise<Record | null> {
  return db.record.findUnique({ where: { id } });
}
```

**Custom error classes:**

```typescript
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}
```

**API error handling (middleware):**

```typescript
// In route handler wrapper
try {
  // business logic
} catch (error) {
  if (error instanceof NotFoundError) return res.status(404).json({error});
  if (error instanceof PermissionError) return res.status(403).json({error});
  if (error instanceof ValidationError) return res.status(400).json({error});
  
  logger.error('Unhandled error', {error, userId: session?.user?.id});
  return res.status(500).json({error: 'Internal server error'});
}
```

### Validation Pattern

**Always validate at API boundary, before business logic:**

```typescript
// ✅ GOOD: Validate immediately
export async function POST(req: NextRequest) {
  const body = await req.json();
  const validation = recordSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      {error: 'Invalid input', details: validation.error.issues},
      {status: 400}
    );
  }
  
  const record = await recordService.create(validation.data, userId);
  return NextResponse.json(record);
}

// ❌ BAD: Validate in service (inconsistent)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const record = await recordService.create(body, userId);
  return NextResponse.json(record);
}
// Then in service, sometimes validated, sometimes not
```

---

## Database & Schema

### Schema Principles

1. **Source of Truth:** `schema.prisma` is the single source of truth
2. **Migrations:** All changes go through Prisma migrations
3. **Foreign Keys:** Enforced (no orphaned records)
4. **Audit Fields:** Every table has `createdAt`, `updatedAt`
5. **JSONB:** For flexible metadata, indexed with GIN

### Key Tables

**User**
```prisma
model User {
  id String @id @default(cuid())
  email String @unique
  name String?
  role UserRole // ADMIN, MANAGER, RECORDS_MANAGER, STAFF
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Record**
```prisma
model Record {
  id String @id @default(cuid())
  title String
  
  // Content
  description String?
  content String? // Document text/summary
  metadata Json? // Flexible metadata (validated by Zod)
  
  // Lifecycle
  status RecordStatus // DRAFT, REGISTERED, ARCHIVED
  ownerId String @db.Uuid
  owner User @relation(fields: [ownerId], references: [id])
  createdBy String @db.Uuid
  
  // Relations
  linkedProjectId String?
  linkedProject Project? @relation(fields: [linkedProjectId], references: [id])
  registeredCompanyId String?
  registeredCompany RegisteredCompany? @relation(fields: [registeredCompanyId], references: [id])
  
  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  RecordAccess RecordAccess[]
  AuditLog AuditLog[]
  
  @@index([status])
  @@index([ownerId])
  @@index([metadata(ops: JsonbOps)], type: Gin)
}

enum RecordStatus {
  DRAFT
  REGISTERED
  ARCHIVED
}
```

**AccessRequest**
```prisma
model AccessRequest {
  id String @id @default(cuid())
  
  // Resource (exactly one must be set)
  recordId String?
  registeredCompanyId String?
  
  // Request metadata
  requesterId String @db.Uuid
  requester User @relation(fields: [requesterId], references: [id])
  
  requestedAccessLevel String // READ, WRITE, ADMIN
  status String @default("PENDING") // PENDING, APPROVED, REJECTED
  
  // Approval metadata
  reviewedBy String? @db.Uuid
  reviewer User? @relation("ReviewedBy", fields: [reviewedBy], references: [id])
  reviewedAt DateTime?
  approvedAccessLevel String?
  
  // Governance
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([recordId, requesterId, status])
  @@index([status])
  @@index([reviewedBy])
}
```

**RecordAccess**
```prisma
model RecordAccess {
  id String @id @default(cuid())
  recordId String
  record Record @relation(fields: [recordId], references: [id], onDelete: Cascade)
  
  userId String @db.Uuid
  user User @relation(fields: [userId], references: [id])
  
  accessLevel String // READ, WRITE
  grantedBy String @db.Uuid
  grantedAt DateTime @default(now())
  expiresAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([recordId, userId])
  @@index([userId])
  @@index([expiresAt])
}
```

**AuditLog** (Immutable append-only)
```prisma
model AuditLog {
  id String @id @default(cuid())
  
  // What changed
  recordId String?
  record Record? @relation(fields: [recordId], references: [id], onDelete: SetNull)
  
  action String // RECORD_CREATED, METADATA_CHANGED, ACCESS_GRANTED, etc.
  details Json? // Deep diff, affected users, etc.
  
  // Who and when
  userId String @db.Uuid
  createdAt DateTime @default(now())
  
  @@index([recordId])
  @@index([action])
  @@index([userId])
  @@index([createdAt])
}
```

---

## Access Control Model

### Role Definitions

| Role | Can Create Records | Can Read All | Can Modify Own | Can Approve | Can Admin |
|------|---|---|---|---|---|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MANAGER** | ✅ | Own + subordinates | ✅ | ✅ | ❌ |
| **RECORDS_MANAGER** | ✅ | Assigned to them | ✅ | ❌ | ❌ |
| **STAFF** | ✅ | Own + granted | Own only | ❌ | ❌ |

### Permission Evaluation

**Location:** `lib/acs.ts`

**Key methods:**

```typescript
// Can user read this record?
ACS.canReadRecord(userId: string, recordId: string): Promise<boolean>

// Can user modify this record?
ACS.canEditRecord(userId: string, recordId: string): Promise<boolean>

// Can user delete this record?
ACS.canDeleteRecord(userId: string, recordId: string): Promise<boolean>

// Can user approve access requests?
ACS.canApproveAccessRequests(userId: string): Promise<boolean>

// Can user manage governance (classification, immutability)?
ACS.canManageGovernance(userId: string, recordId: string): Promise<boolean>

// Evaluate all access for a user against a record
ACS.evaluate(userId: string, recordId: string): Promise<AccessLevel>
```

### How Permissions Work

**Order of evaluation (first match wins):**

1. **Direct RecordAccess** - User has explicit grant
2. **CompanyAccess** - User has company-level access
3. **Global Role** - User's role allows it (Admin, Manager)
4. **Deny** - No permission

**Example:**

```
User: staff-123 (STAFF role)
Trying to: Read Record-ABC

Check 1: RecordAccess { recordId: Record-ABC, userId: staff-123 }?
  → Found: accessLevel=READ, expiresAt=null
  → ALLOW

Check 2: If not found, check CompanyAccess
Check 3: If not found, check staff role (cannot read all)
Check 4: DENY
```

### Immutability Rules

**DRAFT records:** All fields editable by owner

**REGISTERED records:**
- Immutable: `classification`, `investmentAmount`, `currency`, `investmentType`, `investorName`
- Editable: `description`, `tags`, `internalNotes`
- Only ADMIN can override immutability

**ARCHIVED records:** No edits allowed

---

## Governance & Auditing

### Audit Trail Requirements

**What gets logged:**
- ✅ Record creation/updates
- ✅ Metadata changes (with before/after values)
- ✅ Status transitions (DRAFT → REGISTERED)
- ✅ Access grants and revocations
- ✅ Access request approvals/rejections
- ✅ Permission checks that fail
- ✅ Sensitive field changes

**What's NOT logged:**
- ❌ Read operations (too noisy)
- ❌ Search queries
- ❌ UI page loads

### Deep Diff Format

When metadata changes, log the diff:

```typescript
{
  action: "METADATA_CHANGED",
  recordId: "rec-123",
  userId: "user-456",
  details: {
    changedFields: ["investmentAmount", "classification"],
    diffs: [
      {
        field: "investmentAmount",
        oldValue: 1000000,
        newValue: 2000000
      },
      {
        field: "classification",
        oldValue: "PUBLIC",
        newValue: "CONFIDENTIAL"
      }
    ],
    // If sensitive field changed, flag it
    sensitiveChanges: ["classification"],
    // If this affects access, note it
    triggeredAccessRevalidation: true,
    affectedAccessCount: 3
  }
}
```

### Access Re-evaluation

**When sensitive fields change:**
1. Log the change
2. Identify all users with access to this record
3. Check if their access level is still valid for new classification
4. Flag affected access records for review (don't auto-revoke yet)
5. Optionally: Notify affected users

**Example:**

```
Record was PUBLIC, staff had READ access
Record changed to CONFIDENTIAL
→ Staff's PUBLIC-level access is no longer valid
→ Log: "METADATA_CHANGE_TRIGGERED_ACCESS_REVALIDATION"
→ Flag access for manager review
→ Optional: Notify staff "Your access to Record-123 may have changed"
```

### Compliance Queries

**Must be answerable:**

1. "Who had access to Record-X on Date-Y?"
   → Query AuditLog + AccessRequest timeline

2. "Who approved access to Record-X for User-Y?"
   → Query AuditLog { action: "ACCESS_GRANTED", recordId, userId }

3. "What changed in Record-X between Date-A and Date-B?"
   → Query AuditLog { recordId, createdAt between dates }

4. "Why was access denied to User-X for Record-Y?"
   → Query AuditLog { action: "PERMISSION_DENIED" }

---

## How to Ask for Help

### Asking Claude for Code

**❌ VAGUE:**
```
Help me implement access requests
```

**✅ SPECIFIC:**
```
I need to implement the POST /api/access-requests endpoint.

Context:
- Creates AccessRequest record for a specific Record or Company
- Validates using Zod schema
- Checks for duplicate pending requests (409 Conflict)
- Logs to AuditLog
- Runs permission check (who can request?)

Reference:
- Similar: POST /api/records (see that file for pattern)
- Depends on: ACS.canRequestAccess()
- Schema: accessRequestSchema (in lib/validation.ts)

What I need:
1. Full endpoint implementation
2. Error handling (validation, duplicates, permissions)
3. Type safety
4. Audit logging
5. Tests

Here's the partial implementation: [code snippet]
```

### Asking Claude for Review

**❌ VAGUE:**
```
Is this code good?
```

**✅ SPECIFIC:**
```
Review this access control check:

Context:
- This runs on every GET /api/records/:id request
- Should prevent staff from reading records they don't have access to
- Should allow managers to read their team's records

Performance concern:
- DB query for every request might be slow
- Should we cache?

Here's the code: [implementation]

Questions:
1. Is permission logic correct?
2. Any security gaps?
3. Performance issues?
4. Better error message?
5. Missing edge cases?
```

### Asking Claude for Architecture

**❌ VAGUE:**
```
How should approval workflows work?
```

**✅ SPECIFIC:**
```
Designing Phase B approval workflow.

Context:
- User requests access to a record
- Manager/Admin approves or rejects
- If approved: RecordAccess created, access granted
- If rejected: Request marked REJECTED, user notified

Known constraints:
- GIPC wants to track who approved what
- Need audit trail showing approval chain
- Should prevent duplicate requests
- Access can expire (field: expiresAt)
- Some requests might need escalation if not reviewed in 2 days

Questions:
1. Should approval be async (queue) or sync (immediate)?
2. How to handle cascading denials (if classification changes)?
3. SLA enforcement - when to escalate?
4. Notification strategy?
5. Can admin override a rejection?

What I'm proposing: [rough architecture]
```

---

## Critical Constraints

### Security

🔴 **CRITICAL:**
- ✅ All permission checks must go through ACS
- ✅ Never trust client-side permissions
- ✅ Sensitive data (classification, access level) must be validated server-side
- ✅ No SQL injection (use Prisma ORM)
- ✅ CSRF protection on state-changing operations (handled by Next.js)

### Data Integrity

🔴 **CRITICAL:**
- ✅ Metadata must be validated before storage (Zod)
- ✅ Invalid states prevented (e.g., both recordId and companyId set)
- ✅ Referential integrity enforced (foreign keys)
- ✅ Immutable fields truly immutable (no silent updates)

### Audit & Compliance

🔴 **CRITICAL:**
- ✅ Every state change must be logged to AuditLog
- ✅ AuditLog entries are append-only (never deleted or modified)
- ✅ Timestamp and user ID on every log
- ✅ Deep diffs for sensitive changes (before/after values)

### Performance

🟡 **IMPORTANT:**
- ✅ Metadata queries indexed (GIN on JSONB)
- ✅ RecordAccess queries indexed (userId, expiresAt)
- ✅ AuditLog queries indexed (recordId, action, createdAt)
- ⏳ Caching not yet implemented (Phase C)

### Operational

🟡 **IMPORTANT:**
- ✅ Errors logged with context (userId, recordId)
- ✅ No silent failures (always throw or return explicit error)
- ✅ Meaningful error messages for users
- ✅ All database migrations tracked in version control

---

## Known Issues & Gaps

### 🔴 CRITICAL (Must fix before Phase B)

**1. AccessRequest Schema Incomplete**
- Status: ⚠️ **BLOCKING PHASE B**
- Location: schema.prisma
- Issue: AccessRequest, RecordAccess tables not fully defined
- Fix: Complete schema as shown in [Database & Schema](#database--schema)
- Effort: 1 day

**2. Permission Checks Inconsistent**
- Status: ⚠️ **SECURITY RISK**
- Location: Various API endpoints
- Issue: Some endpoints check permissions, others don't
- Fix: Audit all endpoints, add ACS checks uniformly
- Effort: 2 hours

**3. Metadata Immutability Not Enforced on Update**
- Status: ⚠️ **DATA CORRUPTION RISK**
- Location: PATCH /api/records/[id]
- Issue: Can change immutable fields in REGISTERED records
- Fix: Check `IMMUTABLE_FIELDS_WHEN_REGISTERED` in PATCH handler
- Effort: 2 hours

### 🟠 HIGH (Fix before Phase B)

**4. Access Expiry Not Checked**
- Status: 🟡 **GOVERNANCE VIOLATION**
- Location: lib/acs.ts - canReadRecord()
- Issue: Expired access still allows reading
- Fix: Add expiry check: `if (access.expiresAt && access.expiresAt < now) return false`
- Effort: 1 day (with cron job for cleanup)

**5. Request Deduplication Missing**
- Status: 🟡 **UX PROBLEM**
- Location: POST /api/access-requests
- Issue: Users can create unlimited duplicate requests
- Fix: Add unique constraint + API validation
- Effort: 2 hours

**6. Error Handling Inconsistent**
- Status: 🟡 **MAINTENANCE ISSUE**
- Location: Various services
- Issue: Some throw errors, others return null
- Fix: Standardize on throwing custom errors
- Effort: 1 day

### 🟡 MEDIUM (Nice to have before Phase B)

**7. RecordService is Single Point of Failure**
- Status: 🟡 **ARCHITECTURAL**
- Location: services/recordService.ts
- Issue: Used by Records, Projects, Access features
- Risk: If it breaks, multiple features break
- Fix: Consider extracting permission evaluation
- Effort: 2-3 days (refactoring)

**8. No Background Job for Expired Access Cleanup**
- Status: 🟡 **OPERATIONAL**
- Location: Missing service
- Issue: Expired access stays in DB (data hygiene)
- Fix: Add cron job or lazy cleanup
- Effort: 1 day

---

## Best Practices for Development

### When Writing New Features

1. **Start with schema** (schema.prisma)
   - Define tables/fields
   - Run migration
   - Update TypeScript types

2. **Write validation** (lib/validation.ts)
   - Zod schema for input
   - Test with valid and invalid data

3. **Write business logic** (services/)
   - Permission checks first
   - Then core logic
   - Audit logging last

4. **Write API endpoint** (app/api/)
   - Input validation
   - Permission checks
   - Call service
   - Return response

5. **Write tests**
   - Unit tests for validation
   - Integration tests for workflows
   - Manual testing for UI

### When Modifying Existing Features

1. **Check AuditLog requirements**
   - What should be logged?
   - Are diffs needed?
   - What fields trigger re-evaluation?

2. **Check permission impacts**
   - Who should be allowed?
   - Are checks uniform?
   - Did GIPC rules change?

3. **Check immutability**
   - Can this field be changed in REGISTERED?
   - Should it be?
   - Who can override?

4. **Update tests**
   - Happy path
   - Error cases
   - Permission denial

### When Debugging

1. **Check AuditLog first**
   - What changed?
   - When?
   - By whom?

2. **Check permission evaluation**
   - Is ACS.evaluate() being called?
   - What access level is returned?

3. **Check validation**
   - Is input validated before storage?
   - Are errors returned to user?

4. **Check error logs**
   - Is the error being logged?
   - With what context?

---

## Quick Reference

### Common Tasks

**Create a new feature:**
1. Design schema (schema.prisma)
2. Create validation (Zod schema)
3. Create service (business logic + audit logging)
4. Create API endpoints (validation → service → response)
5. Create UI component

**Add permission check:**
1. Identify who should be allowed (GIPC rule)
2. Add to ACS (permission evaluation method)
3. Call ACS in endpoint/service
4. Return 403 if denied
5. Log permission denial to AuditLog

**Handle sensitive metadata change:**
1. Track old value (before/after diff)
2. Log to AuditLog with sensitiveChanges flag
3. Find affected access records
4. Log: "METADATA_CHANGE_TRIGGERED_ACCESS_REVALIDATION"
5. Flag for manager review (don't auto-revoke)

**Fix a bug:**
1. Check AuditLog to understand what happened
2. Check recent code changes
3. Check permission evaluation (is it correct?)
4. Check validation (is it correct?)
5. Add regression test
6. Update documentation

### File You'll Edit Most

- `schema.prisma` - Database changes
- `lib/acs.ts` - Permission rules
- `lib/metadata/fieldRegistry.ts` - Metadata fields
- `services/auditLog.ts` - Logging requirements
- `app/api/*/route.ts` - Endpoints

### Slack/Docs to Mention

When asking Claude for help, mention:
- Current phase (Phase A done, Phase B planned)
- GIPC governance requirement (why it matters)
- Constraint (immutable field, permission, audit)
- Existing patterns (see file X for similar code)

---

## Questions Claude Should Ask Back

If your request is ambiguous, Claude should ask:

- **"Is this a DRAFT or REGISTERED record?"** (Changes how immutability applies)
- **"Who should be allowed to do this?"** (GIPC role definition)
- **"Does this change affect access control?"** (Need re-evaluation trigger?)
- **"Should this be logged to AuditLog?"** (Compliance requirement)
- **"Is this a Phase A or Phase B feature?"** (Affects priority)
- **"Is this security-critical?"** (Needs extra review)

---

## Communication Guidelines

### When Claude Asks for Clarification

**Expected (and welcome):**
- "Is this DRAFT or REGISTERED?"
- "Who can do this?"
- "Should this be logged?"
- "Does GIPC require this?"

**Respond with:**
- Business rule from GIPC
- Role/permission matrix
- Audit/compliance requirement
- Phase/timeline context

### When You Report a Bug

**Include:**
- Exact steps to reproduce
- Expected vs. actual behavior
- Recent code changes
- AuditLog entries (if relevant)
- User role (admin, staff, etc.)

**Claude will ask:**
- Is this security-critical?
- Is data corrupted?
- Which phase does it affect?
- Should this be logged?

---

## Success Metrics

### Phase A (Metadata Layer)
✅ Metadata queryable (named keys work)
✅ Validation enforced (invalid data rejected)
✅ Auditing works (all changes logged with deep diffs)
✅ Immutability enforced (REGISTERED fields locked)
✅ Re-evaluation triggered (on sensitive changes)

### Phase B (Governance)
✅ Approval workflow works end-to-end
✅ SLA enforced (requests reviewed in time)
✅ Audit trail shows approval chain
✅ Access grants/revocations work
✅ Expiry enforced (access revoked automatically)

### Overall
✅ GIPC can trust the system (audit-defensible)
✅ Users can't bypass with WhatsApp/USB
✅ Governance is enforceable (not just aspirational)
✅ Compliance audits pass (full audit trail)

---

## Glossary

| Term | Definition |
|------|-----------|
| **ACS** | Access Control Service - evaluates permissions |
| **GIPC** | Ghana Investment Promotion Centre - our client |
| **Record** | Investment/investor document |
| **CompanyAccess** | Grant access to all records of a company |
| **RecordAccess** | Grant access to a specific record |
| **AccessRequest** | User request for access (pending manager approval) |
| **DRAFT** | Record in progress, editable |
| **REGISTERED** | Record approved, locked from changes |
| **ARCHIVED** | Record no longer active, hidden |
| **Metadata** | Flexible JSON data on record (amount, type, etc.) |
| **Immutable** | Cannot be changed (unless override permission) |
| **AuditLog** | Immutable append-only log of all changes |
| **Deep Diff** | Before/after values for changed fields |
| **Re-evaluation** | Check if access is still valid after change |
| **SLA** | Service Level Agreement (approval timeline) |

---

## Last Updated

- **Date:** January 27, 2026
- **Status:** Phase A complete, Phase B in planning
- **Next Review:** Before Phase B implementation
- **Maintained By:** GIPC Development Team

---

**Remember:** The goal is a system GIPC can trust. Every decision should support auditability, immutability, and enforceability.

For questions or updates to this file, consult with the GIPC team and your project lead.
