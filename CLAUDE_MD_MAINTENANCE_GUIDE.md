# How to Use & Maintain Claude.md

**A guide for keeping your AI assistant always in sync with your project**

---

## What Claude.md Does

Claude.md is your project's **constitution for AI assistance**:

- 📋 **Reference:** Answer: "What's your tech stack?" → Claude reads Claude.md
- 🗺️ **Navigation:** Answer: "Where should I look?" → Claude finds the file
- 📏 **Standards:** Answer: "How should I code this?" → Claude follows patterns
- 🚨 **Warnings:** Answer: "What could go wrong?" → Claude avoids pitfalls
- 🎯 **Context:** Answer: "What phase are we in?" → Claude prioritizes correctly

**Every conversation becomes more productive because Claude knows:**
- Your architecture
- Your constraints
- Your governance model
- Your known issues
- Your code standards
- What matters to GIPC

---

## Where to Put It

```
gipc-erm/
├─ Claude.md ← ROOT OF PROJECT
├─ README.md
├─ package.json
├─ schema.prisma
└─ ... (other files)
```

**Critical:** Place in root, not buried in docs folder.

Claude will find it automatically when analyzing your project.

---

## How Claude Uses It

### When You Start a Conversation

```
User: "Help me implement the approval workflow"

Claude's internal process:
1. Look for Claude.md in project root
2. Read it (understands Phase B, governance model, ACS pattern)
3. Check: "What's the current phase?" → Phase B Planning
4. Check: "What's the approval workflow?" → AccessRequest → Approval → RecordAccess
5. Check: "What are known issues?" → Schema incomplete, permission checks scattered
6. Ask for clarification if needed
7. Provide implementation tailored to YOUR project (not generic)
```

### During Code Review

```
User: "Review this access control code"

Claude's internal process:
1. Read Claude.md for permission model
2. Check: "Is this using ACS.canReadRecord()?" ✓ or ✗
3. Check: "Is this endpoint properly protected?" 
4. Check: "Are there known issues here?" → Inconsistent permission checks
5. Provide specific feedback based on YOUR standards
```

### When You Ask for Architecture

```
User: "Should I cache permission checks?"

Claude's internal process:
1. Read Claude.md constraints
2. Check: "Phase?" → Phase A complete (can look ahead to C)
3. Check: "Performance concerns?" → GIN indexing done, caching not yet
4. Check: "What does GIPC require?" → Auditability, immutability, enforceability
5. Provide recommendation based on YOUR project reality
```

---

## What to Update and When

### Weekly (Small Updates)

**When you:**
- Add a new API endpoint
- Create a new service
- Fix a bug

**Update Claude.md:**
- Add to "Critical Constraints" if new constraint discovered
- Update "Known Issues" if issue fixed
- Update timeline if phase progress changed

```markdown
// Example: You fixed the permission check inconsistency
🟠 HIGH (Fix before Phase B)
2. Permission Checks Inconsistent
- Status: ✅ FIXED
- Fixed: Jan 28, 2026
- Changes: Added ACS checks to [list endpoints]
```

### Every Phase Completion (Major Update)

**When you finish Phase A/B/C:**
1. Update "Current Status & Phases"
2. Move completed items to ✅
3. Update "Known Issues" (what got fixed, what's new)
4. Update "Next Steps" for team

```markdown
### Phase A: Metadata Layer Hardening ✅ COMPLETE
**What was done:**
- ✅ UUID metadata keys → named keys (queryable)
- ✅ Server-side validation (Zod schema)
... (all complete)

**What got fixed:**
- Issue #3: Metadata immutability now enforced ✅

**What's new:**
- Issue #7: RecordService is single point of failure (identified)
```

### When Requirements Change (Emergency Update)

**When GIPC changes a rule:**
- Update "Access Control Model"
- Update "Governance & Auditing"
- Update "Critical Constraints"
- Add to "Known Issues" if implementation not done

```markdown
## 2026-01-28: GIPC changed approval timeline

New requirement: All access requests must be reviewed within 1 business day (was 2).

**Updated:**
- Phase B timeline (affects SLA enforcement)
- Known Issue #5 (access expiry & SLA)

**Action items:**
- Update SLA calculation
- Update escalation logic
- Notify team
```

### Quarterly (Full Review)

**First day of each quarter:**
1. Read the entire Claude.md
2. Check: "Is this still accurate?"
3. Check: "Did we miss anything?"
4. Update status, timeline, known issues
5. Commit to git with message: "Q2 2026 Claude.md review"

---

## How to Write Good Updates

### ❌ BAD Update

```markdown
Fixed access checking
```

**Problems:**
- Vague (which access checking?)
- No context (why was it broken?)
- No evidence (how do we verify?)

### ✅ GOOD Update

```markdown
**2. Permission Checks Inconsistent**
- Status: ✅ FIXED (Jan 28, 2026)
- What was wrong: GET /api/records had no ACS check, allowed staff to read records
- How we fixed: Added ACS.canReadRecord() check before returning data
- Where changed: app/api/records/[id]/route.ts:24
- How to verify: Staff now gets 403 when accessing unauthorized record
```

---

## Real-World Examples

### Example 1: Adding a New Field

**Situation:** You need to add a `certificationNumber` field to Record metadata

**What to do:**

1. **Update schema.prisma**
   - Add field to metadata in Record model (it's JSONB, no migration needed)

2. **Update lib/metadata/fieldRegistry.ts**
   ```typescript
   certificationNumber: {
     type: 'string',
     immutableWhenRegistered: true,
     required: false,
     description: 'Certification number for legal proceedings'
   }
   ```

3. **Update Claude.md**
   ```markdown
   ## Database & Schema
   ### Metadata Fields
   - investmentAmount (number)
   - currency (enum: USD, EUR, GHS, GBP)
   - certificationNumber (string) ← NEW
   ```

4. **Commit with message:**
   ```
   feat: Add certificationNumber to Record metadata

   Updated Claude.md to reflect new field and immutability rules.
   ```

Claude now knows about this field and won't suggest redundant implementations.

---

### Example 2: Discovering a Bug

**Situation:** You find that RecordAccess expiry is not being checked

**What to do:**

1. **Test and confirm the bug**
   - Create RecordAccess with expiresAt in past
   - Verify access is still allowed (should be denied)

2. **Update Claude.md**
   ```markdown
   ### 🟠 HIGH (Fix before Phase B)
   
   **4. Access Expiry Not Checked**
   - Status: 🟡 **DISCOVERED** (Jan 29, 2026)
   - Location: lib/acs.ts - canReadRecord()
   - Issue: User with expired access can still read
   - Severity: HIGH (governance violation)
   - Proof: [steps to reproduce above]
   - Fix: Add check in canReadRecord()
   - Effort: 1 day
   ```

3. **Create issue/ticket**
   - Link to Claude.md
   - Prioritize (fix before Phase B)

4. **Later, when fixed:**
   ```markdown
   **4. Access Expiry Not Checked**
   - Status: ✅ FIXED (Feb 15, 2026)
   - Changes: Added expiresAt check in ACS.canReadRecord()
   - Tests: Added test for expired access
   - Verified: Expired access now denied as expected
   ```

Claude now knows this was a known issue and won't suggest reimplementing it.

---

### Example 3: Architectural Decision

**Situation:** You decide to add caching for permission checks

**What to do:**

1. **Make the decision with team**
   - Why? (Permission checks on every request are slow)
   - How? (In-memory cache with TTL)
   - When? (Phase C optimization)

2. **Update Claude.md**
   ```markdown
   ## Code Standards & Patterns
   
   ### Permission Caching Strategy
   
   **Decision (Jan 30, 2026):** Cache ACS permission checks with 5-minute TTL
   
   **Why:** 
   - Permission checks (ACS.evaluate) are expensive (DB query per feature)
   - Cache reduces load and improves response time
   - 5-min TTL is safe for governance (still audit-defensible)
   
   **Implementation (Phase C):**
   - Use in-memory cache (node-cache library)
   - Cache key: `userId:recordId`
   - TTL: 5 minutes
   - Invalidate on access grant/revoke
   - Fallback to DB if cache miss
   
   **Risks & Mitigations:**
   - Risk: User's access doesn't show up immediately after grant
     Mitigation: Invalidate cache on ACCESS_GRANTED log
   - Risk: Revoked access still works for 5 minutes
     Mitigation: Acceptable (better than asking GIPC)
   ```

3. **Update Phase C timeline**
   ```markdown
   ### Phase C: Scaling & Operations 🔮 FUTURE
   
   **What would follow Phase B:**
   - Permission caching ← NEW (decided Jan 30)
   - Performance optimization (caching, query optimization)
   - Bulk operations (import/export)
   ```

Claude now knows this is planned and won't suggest reimplementing or debating it.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Letting Claude.md Drift

**What happens:**
- Week 1: Write Claude.md (accurate)
- Week 2: Fix a bug, don't update Claude.md
- Week 3: Change a requirement, forget Claude.md
- Week 4: Claude gives outdated advice (suggests fixed issues as future work)

**Prevention:**
- Update on the day you make the change
- Link Claude.md updates in git commits
- Review Claude.md monthly

---

### ❌ Mistake 2: Making Claude.md Too Long

**What happens:**
- Add every detail
- File becomes 200+ pages
- Claude spends time reading irrelevant sections
- Updates become rare (too much to maintain)

**Prevention:**
- Keep it 1000-1500 lines (current size is good)
- If longer, move to separate docs:
  - `ARCHITECTURE.md` (detailed design)
  - `API.md` (endpoint reference)
  - `GOVERNANCE.md` (access control rules)
  - `TROUBLESHOOTING.md` (debugging guide)
- Claude.md stays as **index + critical info only**

---

### ❌ Mistake 3: Not Committing Claude.md Changes

**What happens:**
- You update Claude.md locally
- Forget to commit
- Team doesn't see updates
- Claude reads old version from git

**Prevention:**
- Commit Claude.md changes with your code changes
- Message: `docs: Update Claude.md - [what changed]`
- Include in pull request review

```bash
git add Claude.md
git commit -m "docs: Update Claude.md - Fixed access expiry issue #123"
git push
```

---

### ❌ Mistake 4: Using Claude.md for Secrets

**What happens:**
- Store database password in Claude.md
- Commit to git (visible to all)
- Password leaked

**Prevention:**
- Claude.md is version-controlled and visible
- **Never put secrets in Claude.md**
- Secrets go in `.env.local` (git-ignored)

---

## Collaboration with Team

### Sharing Updates with Team

**When you update Claude.md, tell team:**

```
Slack/Email:
"Updated Claude.md for Phase A completion:
- Fixed access expiry issue ✅
- Identified RecordService bottleneck 🟡
- Known issues updated

See: Claude.md (Known Issues & Gaps section)"
```

### Getting Team Input

**When you're unsure what to update:**

```
Slack:
"Should we update Claude.md for the new classification rule?
- Current: DRAFT → REGISTERED → ARCHIVED
- New: Also allow SUSPENDED state for legal holds

@[lead]: Is this governance model change?
@[team]: Does this affect Phase B timeline?"

→ Update Claude.md based on consensus
```

### Training New Team Members

**When new developer joins:**

```
1. "Read Claude.md first (20 min)"
   - Understand architecture
   - Understand governance model
   - Understand critical constraints

2. "Ask questions about what you don't understand"
   - Claude.md should clarify, not confuse

3. "If Claude.md is unclear, we'll improve it together"
   - Unclear sections = should be clearer

4. "Use Claude.md when asking for help"
   - Reference it in tickets/questions
   - Makes onboarding faster
```

---

## Git Workflow

### Committing Claude.md

**With code changes:**
```bash
git add Claude.md app/api/records/route.ts
git commit -m "feat: Add permission checks to access endpoints

- Added ACS.canReadRecord() check
- Updated Claude.md: Known Issues (Permission Checks) now FIXED"
```

**With just documentation:**
```bash
git add Claude.md
git commit -m "docs: Update Claude.md - Phase A completion

- Mark Phase A COMPLETE ✅
- Remove completed known issues
- Update Phase B timeline"
```

### Reviewing Claude.md in PRs

**When reviewing:**
- Check if Claude.md was updated with code changes
- Suggest updates if needed
- Approve/request changes like code

**Example comment:**
```
"Good implementation! A few things:

1. ✅ Code follows ACS pattern (good)
2. 🟡 Claude.md should be updated:
   - Known Issue #2 (permission checks) now fixed
   - Add this endpoint to Code Standards example

Please update Claude.md before merge."
```

---

## Quarterly Maintenance Checklist

**First Monday of each quarter:**

- [ ] Read entire Claude.md
- [ ] Check: "Is this still accurate?"
  - [ ] Tech stack (same?)
  - [ ] Phases (same timeline?)
  - [ ] Known issues (same status?)
  - [ ] Constraints (same rules?)
- [ ] Check: "Did we miss anything?"
  - [ ] New fields? Add to metadata
  - [ ] New endpoints? Add to standards
  - [ ] New constraints? Add to critical constraints
- [ ] Update version and timestamp
- [ ] Commit with message: `docs: Q[N] [YEAR] Claude.md review`

---

## Evolution Path

### Month 1-2 (Phase A)
Claude.md focused on:
- Metadata architecture
- Validation patterns
- Audit logging
- Immutability rules

### Month 3 (Phase B)
Claude.md focused on:
- Approval workflows
- Access control model
- Governance constraints
- SLA enforcement

### Month 4+ (Phase C)
Claude.md adds:
- Performance optimization patterns
- Caching strategies
- Scaling concerns
- Multi-tenant considerations (if needed)

---

## Troubleshooting: Claude Seems Out of Sync

**Symptom:** Claude suggests doing work that's already done

**Diagnosis:**
1. Check if Claude.md is in your project root
2. Check if Claude.md is in git (is it committed?)
3. Check if you mentioned the file (did you upload the latest version?)
4. Check if the file was updated (last update date recent?)

**Fix:**
1. Make sure Claude.md is committed to git
2. In conversation, mention: "I have a Claude.md in my project"
3. Or upload the file directly
4. Claude will sync and give better advice

---

## Key Principle

**Claude.md is living documentation:**

- It evolves with your project
- It helps Claude stay in sync
- It helps new team members onboard
- It helps you remember decisions made
- It prevents duplicate work

**Update it the day you make a change, not weeks later.**

---

## Summary

| Action | When | What | Why |
|--------|------|------|-----|
| **Create** | Day 1 | Claude.md in root | Claude uses it automatically |
| **Update** | Daily | When you change code | Keeps Claude in sync |
| **Commit** | Per PR | Always with code | Team sees updates |
| **Review** | Monthly | Check for drift | Catch miscommunication early |
| **Overhaul** | Quarterly | Full reread | Keep knowledge accurate |

**Remember:** Every hour spent keeping Claude.md accurate saves 10 hours of miscommunication later.

→ **Your Claude.md is your development insurance policy.**
