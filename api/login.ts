import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Generate state for CSRF protection
  const state = randomBytes(32).toString('hex');
  
  // Set state cookie
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`);
  
  // Redirect to Replit OAuth with state
  const replitOAuthUrl = `https://replit.com/oidc/auth?client_id=${process.env.REPL_ID}&redirect_uri=${encodeURIComponent(`https://${req.headers.host}/api/callback`)}&response_type=code&scope=openid%20email%20profile&state=${state}&prompt=login%20consent`;
  
  res.redirect(302, replitOAuthUrl);
}