// Rate limiting storage
const attempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  const userAttempts = attempts.get(ip);
  
  if (!userAttempts) {
    attempts.set(ip, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }
  
  // Reset if window has passed
  if (now - userAttempts.lastAttempt > windowMs) {
    attempts.set(ip, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }
  
  // Check if exceeded
  if (userAttempts.count >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0 };
  }
  
  // Increment count
  userAttempts.count++;
  userAttempts.lastAttempt = now;
  
  return { allowed: true, remainingAttempts: maxAttempts - userAttempts.count };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const userAttempts = attempts.get(ip);
  
  if (!userAttempts) {
    attempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    userAttempts.count++;
    userAttempts.lastAttempt = now;
  }
}

export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}