
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface ServiceUser {
    id: string; // "service_account" or specific ID
    role: string; // "API_CLIENT"
    name: string;
    scopes: string[];
}

/**
 * Validates the API Key from the Authorization header.
 * Header Format: Authorization: Bearer sk_live_12345
 */
export async function validateApiKey(request: NextRequest): Promise<ServiceUser | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    
    // In real world, hash the token. For this demo, assuming token IS the key or hash lookup.
    // Let's assume we store 'keyHash' in DB.
    // If we passed the raw key, we'd hash it here before lookup.
    // For simplicity in this mock, we'll just look up by keyHash = token (INSECURE for prod, but functional for demo structure).
    // TODO: Implement proper hashing (SHA256).
    
    const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash: token }
    });

    if (!apiKey) return null;
    if (!apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update usage stats (async, don't await)
    prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    }).catch(console.error);

    // Parse scopes
    let scopes: string[] = [];
    try {
        if (apiKey.scopes) scopes = JSON.parse(apiKey.scopes);
    } catch (e) {}

    return {
        id: apiKey.id, // Use Key ID as User ID for auditing
        role: 'API_CLIENT',
        name: apiKey.name,
        scopes: scopes
    };
}
