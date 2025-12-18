-- Seed initial data
-- Password for all users: password123 (hashed)

-- Insert users
INSERT INTO "User" (id, email, password, name, role, "createdAt") VALUES
('admin-001', 'admin@example.com', '$2b$10$mNtGUDFUQwzQitVnZe.ZJeljdDDnJCodwoGHJTV7AWLoUtVI1lyoy', 'Admin User', 'ADMIN', NOW()),
('user-001', 'alice@example.com', '$2b$10$mNtGUDFUQwzQitVnZe.ZJeljdDDnJCodwoGHJTV7AWLoUtVI1lyoy', 'Alice', 'USER', NOW()),
('user-002', 'bob@example.com', '$2b$10$mNtGUDFUQwzQitVnZe.ZJeljdDDnJCodwoGHJTV7AWLoUtVI1lyoy', 'Bob', 'USER', NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert groups
-- INSERT INTO "Group" (id, name, type, "createdAt", "updatedAt") VALUES
-- ('group-001', 'IT', 'DEPARTMENT', NOW(), NOW()),
-- ('group-002', 'HR', 'DEPARTMENT', NOW(), NOW()),
-- ('group-003', 'Finance', 'DEPARTMENT', NOW(), NOW())
-- ON CONFLICT DO NOTHING;

-- Link users to groups
-- INSERT INTO "_UserGroups" ("A", "B") VALUES
-- ('group-001', 'user-001'),
-- ('group-002', 'user-002')
-- ON CONFLICT DO NOTHING;

-- Insert public record
-- INSERT INTO "Record" (id, title, description, "fileUrl", "fileType", category, tags, status, visibility, "userId", "createdAt", "updatedAt") VALUES
-- ('record-001', 'Company Policy', 'Public policy document for everyone.', '/uploads/policy.pdf', 'application/pdf', 'Policy', '["policy","public"]', 'ACTIVE', 'PUBLIC', 'admin-001', NOW(), NOW())
-- ON CONFLICT DO NOTHING;

-- -- Insert group records
-- INSERT INTO "Record" (id, title, description, "fileUrl", "fileType", category, tags, status, visibility, "userId", "groupId", "createdAt", "updatedAt" ) VALUES
-- ('record-002', 'IT Infrastructure Guide', 'Internal IT documentation.', '/uploads/it-guide.pdf', 'application/pdf', 'Technical', '["it","guide"]', 'ACTIVE', 'GROUP', 'user-001', 'group-001', NOW(), NOW()),
-- ('record-003', 'Employee Handbook', 'Confidential HR handbook.', '/uploads/hr-handbook.pdf', 'application/pdf', 'HR', '["hr","handbook"]', 'ACTIVE', 'GROUP', 'user-002', 'group-002', NOW(), NOW())
-- ON CONFLICT DO NOTHING;

-- -- Insert private record
-- INSERT INTO "Record" (id, title, description, "fileUrl", "fileType", category, tags, status, visibility, "userId", "createdAt", "updatedAt") VALUES
-- ('record-004', 'Alice Private Draft', 'Draft document only for Alice.', '/uploads/draft.pdf', 'application/pdf', 'Personal', '["draft","private"]', 'PENDING', 'PRIVATE', 'user-001', NOW(), NOW())
-- ON CONFLICT DO NOTHING;
