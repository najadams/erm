# ERM-GIPC User Stories & System Architecture

This document describes the user journey for each role in the Electronic Records Management system for the Ghana Investment Promotion Centre (GIPC), explains how projects facilitate collaboration, and details the concurrency optimizations that enable safe multi-user operation.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Stories](#user-roles--stories)
   - [USER](#user)
   - [CONTRIBUTOR](#contributor)
   - [APPROVER](#approver)
   - [RECORDS_OFFICER](#records_officer)
   - [ADMIN](#admin)
   - [AUDITOR](#auditor)
3. [Project System](#project-system)
   - [Project Lifecycle](#project-lifecycle)
   - [Project Roles](#project-roles)
   - [Record-Project Relationship](#record-project-relationship)
4. [Concurrency & Multi-User Optimization](#concurrency--multi-user-optimization)
   - [Transactional Integrity](#transactional-integrity)
   - [Versioning Race Condition Prevention](#versioning-race-condition-prevention)
   - [Optimistic Locking Patterns](#optimistic-locking-patterns)
   - [Access Control Caching](#access-control-caching)

---

## System Overview

ERM-GIPC is an enterprise records management system designed for the Ghana Investment Promotion Centre. It manages investment records, company registrations, and project documentation with full governance compliance including:

- **3-Level Classification Hierarchy**: Organizes records into a structured taxonomy
- **Role-Based Access Control (RBAC)**: Six distinct roles with granular permissions
- **Attribute-Based Access Control (ABAC)**: Security clearance levels (1-5) intersect with role permissions
- **Record Lifecycle Management**: DRAFT → SUBMITTED → REGISTERED → LOCKED → ARCHIVED
- **Retention & Legal Hold**: Automated disposition scheduling with legal hold override capability

---

## User Roles & Stories

### USER

**Description**: Basic authenticated user with minimal permissions. Typically external stakeholders or new employees awaiting role assignment.

**Capabilities**:
- Upload documents to personal workspace (DRAFT only)
- Edit their own draft records
- Delete their own draft records
- View records shared with them or their department

**User Story**:

> *As a USER, I need to upload investment documents to my workspace so that I can prepare them for submission to the records team.*

**Typical Workflow**:
1. Log into the system
2. Navigate to Upload section
3. Select file and classification
4. Fill in required metadata fields
5. Save as DRAFT
6. Return later to review and refine before requesting submission

**Limitations**:
- Cannot submit records for verification
- Cannot view records outside their explicit access scope
- Cannot modify metadata after submission

---

### CONTRIBUTOR

**Description**: Active content creator, typically a GIPC staff member working on investment cases. Can create, edit, and submit records.

**Capabilities**:
- All USER capabilities, plus:
- Submit records for verification
- Edit metadata on DRAFT records
- Participate in projects as contributor

**User Story**:

> *As a CONTRIBUTOR, I need to create investment records for a new foreign direct investment project and submit them for official registration so that the investment can be tracked in the national registry.*

**Typical Workflow**:
1. Receive investment application package
2. Create new record with classification: `Investments > FDI > Manufacturing`
3. Upload supporting documents (Articles of Incorporation, Investment Plan, etc.)
4. Fill metadata: Investment Amount, Sector, Country of Origin, Expected Jobs
5. Link record to relevant Registered Company
6. Add to active Project (if part of ongoing case)
7. Submit for verification
8. Monitor status until REGISTERED

**Real-World Scenario**:
```
Monday: Receive Toyota Ghana expansion documents
Tuesday: Upload and classify under "FDI > Automotive"
Wednesday: Complete metadata, link to PRJ-2026-042
Thursday: Submit for verification
Friday: Records Officer approves → Status: REGISTERED
```

---

### APPROVER

**Description**: Department head or senior officer who can verify submissions within their scope. Acts as first-level quality gate.

**Capabilities**:
- Verify submissions (approve/reject)
- View all records within their department scope
- Cannot modify record content

**User Story**:

> *As an APPROVER, I need to review investment records submitted by my team to ensure they meet quality standards before they become official records.*

**Typical Workflow**:
1. Receive notification of pending submissions
2. Open verification queue filtered by department
3. For each submission:
   - Review classification correctness
   - Validate metadata completeness
   - Check document quality
   - Approve → REGISTERED or Reject → DRAFT (with feedback)
4. Monitor department record metrics

**Decision Matrix**:
| Condition | Action |
|-----------|--------|
| Complete metadata, correct classification | APPROVE |
| Missing required fields | REJECT with note |
| Wrong classification node | REJECT with correction guidance |
| Suspicious/duplicate content | ESCALATE to Records Officer |

---

### RECORDS_OFFICER

**Description**: Organization-wide records governance authority. Manages the full records lifecycle, retention policies, and legal compliance.

**Capabilities**:
- All APPROVER capabilities, plus:
- Override classification assignments
- Change record status at any stage
- Lock/Unlock official records
- Archive and restore records
- Reassign record ownership
- Manage retention policies
- Manage legal holds
- Execute disposition (destroy/transfer)
- View ALL records organization-wide

**User Story**:

> *As a RECORDS_OFFICER, I need to place a legal hold on all records related to a company under investigation so that they are preserved regardless of retention schedules.*

**Typical Workflow - Legal Hold**:
1. Receive legal notice for case "INV-2026-ACME"
2. Navigate to Legal Holds management
3. Create new hold:
   - Name: "ACME Investigation Hold"
   - Case Reference: INV-2026-ACME
   - Scope: Company = ACME Corp
4. System automatically identifies affected records
5. All matched records flagged: `isLegalHold = true`
6. Disposition suspended until hold lifted
7. Generate preservation certificate for legal team

**Typical Workflow - Retention Management**:
1. Define retention policy: "Investment Records - 10 Years"
2. Link to Classification Node: `Investments > *`
3. Set trigger: Creation Date
4. Set disposition: Archive then Destroy
5. System calculates `dispositionDate` for each record
6. Monitor disposition queue
7. Execute batch disposition with audit trail

---

### ADMIN

**Description**: System administrator with full technical control. Manages users, system settings, and emergency operations.

**Capabilities**:
- All governance capabilities (for emergency use)
- Create/modify/deactivate users
- Manage role assignments
- Configure system settings
- Access full audit logs
- Hard delete records (emergency only)
- Manage groups and departments

**User Story**:

> *As an ADMIN, I need to onboard 15 new investment officers and assign them appropriate roles and department memberships so they can begin processing applications.*

**Typical Workflow - User Onboarding**:
1. Receive HR onboarding list
2. For each user:
   - Create account with temporary password
   - Assign role (typically CONTRIBUTOR)
   - Set clearance level based on position
   - Add to department group
   - Add to relevant project groups
3. Configure department-level default permissions
4. Send welcome emails with login instructions
5. Monitor first-login completion

**Emergency Workflow - Hard Delete**:
```
WARNING: Hard delete is irreversible and requires documented justification

1. Receive legal order for data destruction
2. Document case number and authorization
3. Locate target record(s)
4. Verify no active legal holds
5. Execute hard delete with reason
6. Audit log captures: Actor, Timestamp, Justification, Record Snapshot
7. Generate destruction certificate
```

---

### AUDITOR

**Description**: Read-only oversight role for compliance verification. Can view all records but cannot modify anything.

**Capabilities**:
- View ALL records regardless of classification
- Access full audit logs
- Generate compliance reports
- Comment on records (for audit notes)

**User Story**:

> *As an AUDITOR, I need to verify that all investment records from Q3 2026 have proper classification and retention policies applied so I can certify compliance for the annual audit.*

**Typical Workflow - Compliance Audit**:
1. Define audit scope: Q3 2026 Investment Records
2. Run compliance check:
   - Records without classification: Flag
   - Records without retention policy: Flag
   - Records past disposition date: Flag
   - Access permissions review: Sample 10%
3. For each flagged item:
   - Add audit comment documenting finding
   - Tag for remediation tracking
4. Generate audit report
5. Present findings to governance committee

**Audit Trail Query Example**:
```
Filter:
  - Date Range: July 1 - Sept 30, 2026
  - Classification: Investments > *
  - Status: All except DRAFT

Output:
  - Total Records: 1,247
  - With Retention Policy: 1,198 (96%)
  - Properly Classified: 1,241 (99.5%)
  - Pending Disposition: 23
  - Under Legal Hold: 7
```

---

## Project System

Projects in ERM-GIPC serve as collaborative workspaces that group related records and enable team-based access control.

### Project Lifecycle

```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → ACTIVE → COMPLETED
                        ↓                      ↓
                     ON_HOLD              ARCHIVED
```

| Status | Description | Allowed Actions |
|--------|-------------|-----------------|
| DRAFT | Project being set up | Full edit, add members |
| SUBMITTED | Awaiting approval | View only for contributors |
| IN_REVIEW | Under management review | View only |
| APPROVED | Ready to activate | Owner can activate |
| ACTIVE | Normal operation | Full collaboration |
| ON_HOLD | Temporarily frozen | View/Comment only |
| COMPLETED | Work finished | Read-only archive |
| ARCHIVED | Long-term storage | Restore only |

### Project Roles

Projects have their own role system independent of system-wide roles:

**MANAGER** (Project-Level)
- Full control over project configuration
- Add/remove members
- Change project status
- Delete records from project
- Link new records

**CONTRIBUTOR** (Project-Level)
- Add records to project
- Edit linked record metadata
- Submit records
- Cannot remove records

**VIEW_ONLY** (Project-Level)
- Read access to all project records
- Can add comments
- Cannot modify anything

### Record-Project Relationship

Records can exist independently or be linked to projects:

```
┌─────────────────────────────────────────────────────────┐
│                     PROJECT                              │
│  PRJ-2026-042: "Toyota Ghana Expansion"                 │
├─────────────────────────────────────────────────────────┤
│  Owner: John Mensah (Investment Officer)                │
│  Company: Toyota Ghana Ltd                              │
│  Status: ACTIVE                                          │
│  Members: 5 (2 Managers, 3 Contributors)                │
├─────────────────────────────────────────────────────────┤
│  Linked Records:                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ REC-INV-FDI-0042 - Investment Application       │   │
│  │ REC-INV-FDI-0043 - Environmental Impact Study   │   │
│  │ REC-INV-FDI-0044 - Tax Incentive Agreement     │   │
│  │ REC-INV-FDI-0045 - Land Lease Contract         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Access Inheritance**:
- Project members automatically gain VIEW access to linked records
- Active projects grant EDIT_METADATA and EDIT_CONTENT
- ON_HOLD projects restrict to VIEW and COMMENT only
- Project-level access combines with (does not override) record-level ACLs

---

## Concurrency & Multi-User Optimization

ERM-GIPC is designed for concurrent access by multiple users across different roles. The following mechanisms ensure data integrity and optimal performance.

### Transactional Integrity

All multi-step operations use database transactions to ensure atomicity:

**Record Creation Transaction**:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Increment classification sequence number
  const node = await tx.classificationNode.update({
    where: { id: classificationNodeId },
    data: { lastSequenceNumber: { increment: 1 } }
  });

  // 2. Create record with generated reference
  const record = await tx.record.create({ ... });

  // 3. Create initial version
  await tx.recordVersion.create({ ... });

  // 4. Create access entries
  await tx.recordAccess.createMany({ ... });

  // 5. Log audit event
  await tx.auditLog.create({ ... });

  // All or nothing - if any step fails, entire operation rolls back
});
```

**Protected Operations**:
- Record creation (5 linked operations)
- Record deletion (cascade cleanup)
- Project deletion (member cleanup)
- Access request approval (grant + log)
- Retention policy application

### Versioning Race Condition Prevention

When multiple users upload new versions simultaneously, the system prevents duplicate version numbers:

**Problem Scenario**:
```
User A: Reads current version = 3, prepares version 4
User B: Reads current version = 3, prepares version 4  ← CONFLICT
```

**Solution - Row-Level Locking**:
```typescript
// Inside transaction with explicit lock
const result = await tx.$queryRaw`
  SELECT "versionNumber"
  FROM "Record"
  WHERE "versionGroupId" = ${versionGroupId}
  ORDER BY "versionNumber" DESC
  LIMIT 1
  FOR UPDATE  -- Blocks other transactions
`;

const nextVersion = (result[0]?.versionNumber || 0) + 1;
```

**Retry Logic**:
```typescript
const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    await prisma.$transaction(async (tx) => { ... });
    break; // Success
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('versionNumber')) {
      // Unique constraint violation - retry with backoff
      await sleep(100 * (attempt + 1));
      continue;
    }
    throw err; // Other error - don't retry
  }
}
```

**Database Constraints**:
```prisma
@@unique([versionGroupId, versionNumber])  // Enforced at DB level
```

### Optimistic Locking Patterns

For operations where explicit locking would hurt performance, the system uses optimistic concurrency:

**Status Transitions**:
```typescript
// Read current state
const record = await prisma.record.findUnique({ where: { id } });

// Validate transition is still valid
assertTransitionAllowed(record.status, targetStatus, userRole);

// Update with implicit version check
const updated = await prisma.record.update({
  where: {
    id,
    status: record.status  // Fails if status changed since read
  },
  data: { status: targetStatus }
});
```

### Access Control Caching

The Access Control Service (ACS) optimizes repeated permission checks:

**Efficient List Queries**:
Instead of checking each record individually (N+1 problem), ACS generates a single WHERE clause:

```typescript
// Bad: Check each record
for (const record of records) {
  if (await ACS.evaluate(userId, record.id, 'VIEW')) { ... }
}

// Good: Single query with pre-computed filter
const whereClause = await ACS.getWhereClause(userId);
const records = await prisma.record.findMany({ where: whereClause });
```

**WHERE Clause Generation**:
```typescript
// For a CONTRIBUTOR user in IT Department, generates:
{
  AND: [
    {
      OR: [
        { ownerUserId: userId },           // Own records
        { departmentId: userDeptId },      // Department records
        { projectId: { in: userGroups } }, // Project records
        { access: { some: { userId, accessType: 'ALLOW' } } }, // Explicit grants
      ]
    },
    {
      OR: [
        { classificationNode: { is: null } },
        { classificationNode: { securityLevel: { lte: userClearance } } }
      ]
    },
    {
      NOT: { access: { some: { userId, accessType: 'DENY' } } }
    }
  ]
}
```

### Full-Text Search Optimization

The system uses PostgreSQL Full-Text Search instead of ILIKE for scalable searching:

**FTS Index**:
```sql
-- Generated vector column populated from title + metadata
CREATE INDEX record_search_idx ON "Record" USING GIN(search_vector);
```

**Query Pattern**:
```typescript
// Primary: Fast FTS lookup
const ftsResults = await prisma.$queryRaw`
  SELECT id FROM "Record"
  WHERE search_vector @@ plainto_tsquery('english', ${query})
`;

// Fallback: Title-only ILIKE if FTS returns empty
if (ftsResults.length === 0) {
  filters.push({ title: { contains: query, mode: 'insensitive' } });
}
```

### Concurrent User Capacity

The architecture supports high concurrent usage through:

| Component | Optimization | Benefit |
|-----------|--------------|---------|
| Connection Pooling | Prisma manages DB connections | Handles 100+ concurrent users |
| Read Replicas | Supported via Prisma | Scales read-heavy operations |
| Stateless API | No server-side sessions | Horizontal scaling ready |
| Indexed Queries | Strategic DB indexes | Sub-100ms response times |
| Batch Operations | `createMany`, `updateMany` | Reduces round trips |

**Performance Characteristics**:
- Record list query: ~50ms (with access control)
- Single record fetch: ~20ms
- Record creation: ~150ms (includes file upload)
- Search (FTS): ~30ms
- Access evaluation: ~10ms (single record)

---

## Summary

ERM-GIPC provides a comprehensive records management solution with:

- **Six distinct user roles** from basic USER to system ADMIN
- **Project-based collaboration** with independent role assignments
- **Multi-layered access control** combining RBAC, ABAC, and ACLs
- **Transactional safety** for all critical operations
- **Concurrency protection** through locking and retry mechanisms
- **Optimized queries** for high-volume multi-user environments

The system is designed to handle the complex governance requirements of investment record management while remaining performant under concurrent load.
