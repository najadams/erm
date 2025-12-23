---
description: End-to-End Testing Workflow for ERM-GIPC
---

# ERM-GIPC End-to-End Verification

This workflow verifies the critical paths of the Record Management System.

## 1. Prerequisites
Ensure the application is running:
```bash
npm run dev
```

## 2. Authentication Flow
- [ ] Navigate to `/login`.
- [ ] Log in as Admin (`admin@example.com` / `admin@123!`).
- [ ] Verify redirection to Dashboard (`/`).

## 3. Core Record Lifecycle
### Upload
- [ ] Click "Upload Record" on Dashboard.
- [ ] Fill: Title="Test Doc", Category="General", File=Select any PDF.
- [ ] Submit.
- [ ] Verify success message and appearance in "Recent Documents".

### Search & View
- [ ] Go to "Advanced Search" (`/records`).
- [ ] Search for "Test Doc".
- [ ] Click the result to view details.
- [ ] Verify "Version 1" is listed.

### Versioning
- [ ] (Requires API/Seed) Create a 2nd version or Mock it.
- [ ] Verify "Restore" button appears on older versions.

### Deletion/Disposition
- [ ] On Record Details, clicking "Delete" should prompt confirmation.
- [ ] (Admin Only) Go to `/governance/disposition`.
- [ ] Click "Run Retention Check".
- [ ] Verify records appear if they meet retention criteria.

## 4. Admin Functions
- [ ] Go to `System Health` from sidebar.
- [ ] Verify Charts and KPI cards are loading data.
- [ ] Go to `Users & Roles`.
- [ ] Verify Admin user is listed.

## 5. Security Check (Manual)
- [ ] Log out.
- [ ] Log in as a standard user (if exists).
- [ ] Try to access `/admin/system-health`.
- [ ] Verify redirection or "Unauthorized" message.
