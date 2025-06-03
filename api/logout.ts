import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Clear JWT cookie
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
  
  // Redirect to Replit logout
  const logoutUrl = `https://replit.com/oidc/logout?client_id=${process.env.REPL_ID}&post_logout_redirect_uri=${encodeURIComponent(`https://${req.headers.host}/`)}`;
  
  res.redirect(302, logoutUrl);
}