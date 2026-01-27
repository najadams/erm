import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format');

export function validateEmail(email: string): boolean {
    return emailSchema.safeParse(email).success;
}

export function validateEmailWithError(email: string): { valid: boolean; error?: string } {
    const result = emailSchema.safeParse(email);
    if (result.success) {
        return { valid: true };
    }
    return { valid: false, error: result.error.issues[0]?.message || 'Invalid email format' };
}
