# Claude.md Quick Start

**TL;DR: How to set up Claude.md in your GIPC project (5 minutes)**

---

## Step 1: Copy the File

```bash
# Download Claude.md
cp Claude.md /path/to/your/gipc-erm/

# Verify it's in the root
ls -la gipc-erm/Claude.md
# Output: -rw-r--r--  1 user  staff  45K Jan 27 16:00 Claude.md
```

---

## Step 2: Customize It

Open `Claude.md` and update:

**Line ~20: Project name & dates**
```markdown
# Claude.md - GIPC ERM Development Guide

**Last Updated:** January 2026
**Project Phase:** Phase A Complete, Phase B In Planning
```

**Line ~200: Your actual tech stack**
```
Frontend: [your versions]
Backend: [your versions]
Database: [your versions]
```

**Line ~400: Your current file structure**
Replace the example with your actual structure

**Line ~650: Your actual database schema**
Replace examples with your real schema

**Line ~1000: Your actual known issues**
(Most important - list what YOU know is broken)

---

## Step 3: Commit It

```bash
git add Claude.md
git commit -m "docs: Add Claude.md for AI-assisted development"
git push
```

---

## Step 4: Use It (Right Now)

### For Yourself
```
When stuck, ask Claude:
"Review this against the Claude.md patterns"

Claude will:
1. Find Claude.md in your project
2. Check your architecture
3. Check your constraints
4. Give specific advice (not generic)
```

### For Your Team
```
"Check the Claude.md in project root.
It has our tech stack, patterns, and known issues."

Saves time explaining:
- Why we use Zod (it's in Claude.md)
- What permission checks are needed (it's in Claude.md)
- What's broken (it's in Claude.md)
```

### For Onboarding
```
New developer joins:
1. "Read Claude.md (20 minutes)"
2. "Ask any questions"
3. "Now you understand the project"
```

---

## Step 5: Keep It Updated

### Daily (5 minutes)
When you finish work:
```
1. Did I change code? → Update Claude.md known issues
2. Did I fix a bug? → Mark as FIXED
3. Did I discover a gap? → Add to known issues
```

### Example
```markdown
Before: "Permission checks inconsistent"
After: "Permission checks inconsistent - FIXED (Jan 28)"
```

### Monthly (30 minutes)
Skim Claude.md, ask:
- Is tech stack still accurate? (yes/update)
- Are known issues still relevant? (yes/fix/remove)
- Did we miss anything? (list new issues)

---

## What Claude.md Does For You

### When You Ask Claude for Help

❌ Without Claude.md:
```
User: "Help me implement access requests"
Claude: "Sure! Here's a generic implementation..."
→ Misses your governance requirements
→ Suggests patterns you don't use
```

✅ With Claude.md:
```
User: "Help me implement access requests"
Claude: [Reads Claude.md]
Claude: "I see you need AccessRequest → Approval → RecordAccess.
Your ACS evaluates permissions like this.
Your audit logging requires deep diffs.
Here's the implementation:"
→ Perfectly tailored to your project
```

---

## Real Example

**You ask:**
```
I need to implement GET /api/records/:id

Here's what I have so far:
[code snippet]
```

**Without Claude.md:**
Claude might:
- Suggest generic permission checking
- Not know your ACS pattern
- Not mention immutability rules
- Not remind about audit logging

**With Claude.md:**
Claude knows:
- You use ACS.canReadRecord() (not generic checks)
- You have DRAFT/REGISTERED/ARCHIVED states
- You have immutability rules (can't modify REGISTERED records)
- You log every change with deep diffs
- You check access expiry

Result: Perfect implementation first time.

---

## The 3 Key Sections to Update Regularly

### Section 1: Known Issues & Gaps
```markdown
## Known Issues & Gaps

### 🔴 CRITICAL
[List what's broken, blocking you]

### 🟠 HIGH
[List what's risky]

### 🟡 MEDIUM
[List tech debt]
```

**Update when:**
- You discover a bug → Add to list
- You fix a bug → Mark FIXED
- You finish Phase A → Move to ✅

---

### Section 2: Current Status & Phases
```markdown
## Current Status & Phases

### Phase A: [Description] ✅/🚧/❌
**What was done:**
- ✅ Item 1
- ✅ Item 2

**Outcome:** [What it achieved]
```

**Update when:**
- You complete a phase → Mark ✅
- You start a phase → Mark 🚧
- Phase timeline changes → Update dates

---

### Section 3: Access Control Model
```markdown
## Access Control Model

[Your permission rules]

| Role | Can Create | Can Read All | ... |
|------|-----------|--------------|-----|
| ADMIN | ✅ | ✅ | ... |
```

**Update when:**
- GIPC changes permission rules
- You add a new role
- You discover inconsistency

---

## Quick Commands

```bash
# Check Claude.md is in git
git ls-files Claude.md

# See when it was last updated
git log --oneline Claude.md | head

# Update it (add to commit)
git add Claude.md
git commit -m "docs: Update Claude.md - [what changed]"

# See all Claude.md commits
git log --oneline -- Claude.md
```

---

## Common Questions

**Q: How long should Claude.md be?**
A: 1000-1500 lines (current size). Longer = harder to maintain.

**Q: Should I commit it?**
A: Yes. Version-controlled docs are always up-to-date.

**Q: Do I update it after every commit?**
A: Only if it's relevant (changed architecture, added constraint, fixed known issue).

**Q: What if Claude doesn't read it?**
A: Make sure it's in project root AND you mention it in conversation.

**Q: Can I have multiple Claude.md files?**
A: No. One Claude.md in root only. Use separate docs (ARCHITECTURE.md, etc.) for details.

---

## The Promise

If you keep Claude.md updated:

✅ Claude gives better advice (knows your project)
✅ Onboarding is faster (new devs understand immediately)
✅ Fewer bugs (Claude catches issues you might miss)
✅ Better code (Claude follows YOUR standards, not generic ones)
✅ Team understands decisions (Claude.md is your shared record)

---

## Next Steps

1. **Today:** Copy Claude.md to project root
2. **Today:** Update with your actual project details (30 min)
3. **Today:** Commit to git
4. **Tomorrow:** Use it when asking Claude for help
5. **Daily:** Update when you make changes
6. **Monthly:** Quick review (5 min scan)

---

## That's It

You're done. Claude.md is now your development assistant's guidebook.

Every question you ask Claude will be better understood.
Every answer will be more tailored.
Every mistake will be caught earlier.

→ **Move forward with confidence, not surprises.**
