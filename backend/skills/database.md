# Database Skills (Vercel Postgres)

## Overview
Vercel Postgres skills for Zero-Knowledge database operations with proper security and performance.

## Core Patterns

### Connection Management
```typescript
import { sql } from '@vercel/postgres';

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  try {
    const result = await sql<T>`${sql(text as any)} ${params ? sql(params) : sql``}`;
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database operation failed');
  }
}

// Singleton pattern for connection
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}
```

### Schema Design (Zero-Knowledge)
```sql
-- Always encrypt sensitive fields at application level
-- Database stores encrypted blobs, never raw sensitive data

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_encrypted TEXT NOT NULL,  -- Encrypted email
  password_hash TEXT NOT NULL,    -- bcrypt hash, NEVER plaintext
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_encrypted TEXT NOT NULL,  -- Encrypted title
  content_encrypted TEXT,         -- Encrypted content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (never index encrypted data directly)
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
```

### CRUD Operations (Zero-Knowledge Pattern)

**Create Note (Input Sanitization)**
```typescript
import { z } from 'zod';

const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000).optional(),
});

export async function createNote(userId: string, rawTitle: string, rawContent?: string) {
  // Validate input BEFORE encryption
  const validated = createNoteSchema.parse({ title: rawTitle, content: rawContent });

  // Encrypt at application layer - database never sees plaintext
  const titleEncrypted = encrypt(validated.title);
  const contentEncrypted = validated.content ? encrypt(validated.content) : null;

  const result = await sql`
    INSERT INTO notes (user_id, title_encrypted, content_encrypted)
    VALUES (${userId}, ${titleEncrypted}, ${contentEncrypted})
    RETURNING id, user_id, created_at;
  `;

  return result.rows[0];
}
```

**Read Notes (Decryption)**
```typescript
export async function getUserNotes(userId: string, limit = 50, offset = 0) {
  const result = await sql`
    SELECT id, title_encrypted, content_encrypted, created_at, updated_at
    FROM notes
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  // Decrypt before returning to client
  return result.rows.map(note => ({
    id: note.id,
    title: decrypt(note.title_encrypted),
    content: note.content_encrypted ? decrypt(note.content_encrypted) : null,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }));
}
```

**Update Note**
```typescript
export async function updateNote(noteId: string, userId: string, rawTitle?: string, rawContent?: string) {
  // Verify ownership first
  const existing = await sql`
    SELECT id FROM notes
    WHERE id = ${noteId} AND user_id = ${userId};
  `;

  if (existing.rows.length === 0) {
    throw new Error('Note not found or access denied');
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (rawTitle !== undefined) {
    updates.push(`title_encrypted = $${paramIndex++}`);
    params.push(encrypt(rawTitle));
  }

  if (rawContent !== undefined) {
    updates.push(`content_encrypted = $${paramIndex++}`);
    params.push(encrypt(rawContent));
  }

  updates.push(`updated_at = NOW()`);
  params.push(noteId);

  await sql`UPDATE notes SET ${sql(updates.join(', '))} WHERE id = ${noteId}`;
}
```

**Delete Note**
```typescript
export async function deleteNote(noteId: string, userId: string) {
  const result = await sql`
    DELETE FROM notes
    WHERE id = ${noteId} AND user_id = ${userId}
    RETURNING id;
  `;

  return result.rows.length > 0;
}
```

## Encryption Utilities

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

## Best Practices

1. **Zero-Knowledge Encryption** - Encrypt before storage, decrypt on retrieval
2. **Parameterized Queries** - Never interpolate user input directly
3. **Connection Pooling** - Reuse connections for performance
4. **Index Wisely** - Index columns used in WHERE/JOIN clauses
5. **Batch Operations** - Use bulk inserts/updates when possible
6. **Transactions** - Wrap multi-step operations in transactions

## Performance Optimization

```typescript
// Use LIMIT and pagination
const PAGE_SIZE = 20;
const offset = (page - 1) * PAGE_SIZE;

// Use prepared statements (automatic with sql template)
const result = await sql`SELECT * FROM notes WHERE user_id = ${userId} LIMIT 20`;

// Use connection pooling for concurrent requests
const pool = getPool();
```

## Security Checklist

- [ ] All sensitive fields encrypted at app level
- [ ] Passwords hashed with bcrypt/argon2 (never stored plaintext)
- [ ] Parameterized queries prevent SQL injection
- [ ] Row-level security ensures user can only access own data
- [ ] Database credentials stored in environment variables
- [ ] SSL/TLS enforced for all connections