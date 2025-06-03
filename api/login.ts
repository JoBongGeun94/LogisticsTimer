import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Redirect to Replit OAuth
  const replitOAuthUrl = `https://replit.com/oidc/auth?client_id=${process.env.REPL_ID}&redirect_uri=${encodeURIComponent(`https://${req.headers.host}/api/callback`)}&response_type=code&scope=openid%20email%20profile&prompt=login%20consent`;
  
  res.redirect(302, replitOAuthUrl);
}