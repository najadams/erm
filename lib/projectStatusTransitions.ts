/**
 * Project Status Transitions Module
 *
 * Defines the valid status transitions for projects and provides
 * helper functions for transition validation.
 */

export type ProjectStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED';

/**
 * Valid status transitions for each project status.
 * Key is the current status, value is an array of allowed target statuses.
 */
export const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['SUBMITTED', 'ARCHIVED'],
  SUBMITTED: ['IN_REVIEW', 'DRAFT', 'ARCHIVED'],
  IN_REVIEW: ['APPROVED', 'ON_HOLD', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['ACTIVE', 'ARCHIVED', 'COMPLETED'],
  ACTIVE: ['COMPLETED', 'ON_HOLD', 'ARCHIVED'],
  ON_HOLD: ['ACTIVE', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED', 'ACTIVE'],
  ARCHIVED: ['DRAFT'],
};

/**
 * Main workflow statuses displayed as columns in the Kanban board.
 * ON_HOLD and ARCHIVED are shown separately.
 */
export const MAIN_WORKFLOW_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'APPROVED',
  'ACTIVE',
  'COMPLETED',
];

/**
 * Configuration for each status including display label and colors.
 */
export const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    bgColor: string;
    borderColor: string;
    textColor: string;
  }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'default',
    bgColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    textColor: '#757575',
  },
  SUBMITTED: {
    label: 'Submitted',
    color: 'info',
    bgColor: '#e3f2fd',
    borderColor: '#90caf9',
    textColor: '#1565c0',
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'warning',
    bgColor: '#fff3e0',
    borderColor: '#ffb74d',
    textColor: '#e65100',
  },
  APPROVED: {
    label: 'Approved',
    color: 'success',
    bgColor: '#e8f5e9',
    borderColor: '#81c784',
    textColor: '#2e7d32',
  },
  ACTIVE: {
    label: 'Active',
    color: 'primary',
    bgColor: '#e8eaf6',
    borderColor: '#7986cb',
    textColor: '#303f9f',
  },
  ON_HOLD: {
    label: 'On Hold',
    color: 'warning',
    bgColor: '#fff8e1',
    borderColor: '#ffc107',
    textColor: '#ff8f00',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'success',
    bgColor: '#e0f2f1',
    borderColor: '#4db6ac',
    textColor: '#00695c',
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'default',
    bgColor: '#eceff1',
    borderColor: '#90a4ae',
    textColor: '#546e7a',
  },
};

/**
 * Check if a transition from one status to another is valid.
 */
export function canTransition(from: string, to: string): boolean {
  const fromStatus = from as ProjectStatus;
  const toStatus = to as ProjectStatus;

  if (!ALLOWED_TRANSITIONS[fromStatus]) {
    return false;
  }

  return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

/**
 * Get all valid target statuses for a given status.
 */
export function getAllowedTargets(from: string): ProjectStatus[] {
  const fromStatus = from as ProjectStatus;
  return ALLOWED_TRANSITIONS[fromStatus] || [];
}

/**
 * Check if a status is a valid ProjectStatus.
 */
export function isValidStatus(status: string): status is ProjectStatus {
  return Object.keys(ALLOWED_TRANSITIONS).includes(status);
}
