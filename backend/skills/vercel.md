# Vercel Skills

## Overview
Vercel skills for deploying serverless functions and full-stack applications.

## Core Concepts

### Vercel Functions (Serverless)
```
api/
├── auth/
│   ├── login.ts
│   ├── register.ts
│   └── logout.ts
├── notes/
│   ├── index.ts      # GET/POST /api/notes
│   └── [id].ts       # GET/PUT/DELETE /api/notes/:id
└── _lib/
    └── db.ts         # Database client
```

### Runtime Configuration
```typescript
// api/example.ts
export const config = {
  runtime: 'nodejs18',
  maxDuration: 60, // seconds (max 300 on Pro)
};
```

### Environment Variables
```
# .env.local (local development)
DATABASE_URL=postgres://...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=your-secret-key

# Vercel Dashboard > Settings > Environment Variables
# NEVER commit secrets to Git
```

## Best Practices

1. **Zero-Knowledge Architecture**
   - All sensitive data processed server-side only
   - Client receives only encrypted/sanitized responses
   - Database queries never expose raw data to frontend

2. **API Routes Pattern**
   - Single responsibility per route
   - Input validation with Zod
   - Consistent error response format
   - Proper HTTP status codes

3. **Edge vs Node Runtime**
   - Edge: fast, stateless, limited imports
   - Node: full Node.js, database connections

4. **Cold Starts**
   - Minimize imports in handler
   - Use connection pooling for databases
   - Consider keep-alive strategies

### Request/Response Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createNoteSchema.parse(body);

    // Process with Zero-Knowledge: never expose raw data
    const note = await createNote(validated.title, validated.content);

    return NextResponse.json(
      { data: encryptNote(note) }, // Encrypt before sending
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Deployment

### Vercel CLI
```bash
vercel deploy              # Deploy to preview
vercel --prod             # Deploy to production
vercel logs <function>    # View function logs
```

### Environment Config
```typescript
// Use process.env - automatically populated from Vercel dashboard
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL not configured');
```

## Monitoring

- Use Vercel Dashboard for function logs
- Set up proper error tracking (Sentry)
- Monitor cold start times
- Track API response times