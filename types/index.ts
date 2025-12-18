export type RecordStatus = 'active' | 'archived' | 'pending_review' | 'verified';

export interface Record {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx' | 'image' | 'spreadsheet' | 'other';
  category: string;
  tags: string[];
  status: RecordStatus;
  createdAt: string; // ISO Date
  updatedAt: string;
  uploadedBy: string; // User ID
  
  // New API Fields
  referenceNumber?: string;
  recordType?: { name: string; code?: string };
  classificationNode?: { name: string; code?: string };
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'staff' | 'auditor';
  avatarUrl?: string;
}

export interface DashboardStats {
  totalRecords: number;
  recentUploads: number;
  pendingReview: number;
  storageUsed: string;
}
