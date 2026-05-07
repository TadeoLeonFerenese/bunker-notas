# Auth Skills (Supabase + JWT)

## Overview
Authentication skills using Supabase Auth with JWT tokens for Zero-Knowledge architecture.

## Core Patterns

### Authentication Flow
```
1. User submits credentials (email/password)
2. Server validates, returns JWT (access + refresh)
3. Client stores tokens securely (httpOnly cookies preferred)
4. Subsequent requests include JWT in Authorization header
5. Server validates JWT on each protected route
```

### Token Structure
```typescript
// JWT Payload - minimal data, never expose sensitive info
interface TokenPayload {
  sub: string;           // User ID (UUID)
  email: string;        // User email
  iat: number;          // Issued at
  exp: number;          // Expiration
  role: 'authenticated' | 'anon';
}
```

## Supabase Auth Integration

### Initialize Client (Server-side)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Server-side only!
);

// Use service key for server operations
// Use anon key for client-side public operations
```

### Registration
```typescript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = registerSchema.parse(body);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.BASE_URL}/auth/callback`,
    },
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Never return sensitive data
  return Response.json({
    user: { id: data.user?.id, email: data.user?.email },
  });
}
```

### Login
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Return tokens - store securely in client
  // Prefer httpOnly cookies for extra security
  return Response.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    expires_in: data.session?.expires_in,
  });
}
```

### Token Refresh
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { refresh_token } = body;

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (error) {
    return Response.json({ error: 'Session expired' }, { status: 401 });
  }

  return Response.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
}
```

## Zero-Knowledge Auth Principles

1. **Never expose raw passwords** - Hash before storage (Supabase handles this)
2. **Minimal token claims** - Only what's necessary for auth
3. **Secure token storage** - httpOnly cookies preferred over localStorage
4. **Server-side validation** - Always validate tokens on server, never trust client
5. **Short access token lifespan** - 1 hour access, 30 day refresh typical
6. **Rate limiting** - Prevent brute force on auth endpoints

### Protected Route Middleware
```typescript
import { createClient } from '@supabase/supabase-js';

export async function withAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data: user, error } = await supabase.auth.getUser(token);

  if (error || !user.user) {
    return { error: 'Invalid token', status: 401 };
  }

  return { user: user.user, error: null };
}

// Usage in API route:
export async function GET(request: Request) {
  const auth = await withAuth(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  // User is authenticated, proceed with business logic
  const userId = auth.user!.id;
  // ... fetch user data
}
```

## Security Considerations

- Enable 2FA for sensitive operations
- Implement proper CSRF protection
- Use HTTPS only (enforce in production)
- Log authentication attempts (without sensitive data)
- Implement account lockout after failed attempts
- Use secure password requirements (min length, complexity)