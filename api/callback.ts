import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import { signToken } from './jwt-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  // Verify state parameter for CSRF protection
  const cookies = req.headers.cookie?.split(';').reduce((acc: Record<string, string>, cookie: string) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {}) || {};

  const storedState = cookies.oauth_state;
  
  if (!storedState || storedState !== state) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://replit.com/oidc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.REPL_ID!,
        code: code as string,
        redirect_uri: `https://${req.headers.host}/api/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' });
    }

    // Get user info
    const userResponse = await fetch('https://replit.com/oidc/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Upsert user in database
    const [user] = await db
      .insert(schema.users)
      .values({
        id: userData.sub,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        profileImageUrl: userData.profile_image_url,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          profileImageUrl: userData.profile_image_url,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Generate JWT token
    const token = signToken({ userId: user.id, email: user.email || undefined });
    
    // Set secure cookie with JWT and clear state cookie
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
      `oauth_state=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
    ]);
    
    // Redirect to home
    res.redirect(302, '/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}