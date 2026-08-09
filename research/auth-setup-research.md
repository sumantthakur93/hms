# Auth.js v5 (NextAuth.js) Setup with Prisma Adapter and Supabase PostgreSQL for Hospital Management System

## Research Summary

This document provides comprehensive guidance on setting up Auth.js v5 with Prisma adapter and Supabase PostgreSQL for a Hospital Management System (HMS) with 5 roles: Admin, Doctor, Patient, Receptionist, and Lab Technician. All information is sourced from official documentation.

---

## 1. Auth.js v5 + Prisma Adapter

### Installation

**Source:** https://authjs.dev/getting-started/adapters/prisma

Install the required packages:

```bash
npm install @prisma/client @auth/prisma-adapter
npm install prisma --save-dev
```

**Note:** As of Auth.js v5, the adapter package has moved from `@next-auth/prisma-adapter` to `@auth/prisma-adapter` [Source: https://authjs.dev/getting-started/migrating-to-v5]

### Prisma Instance Setup

**Source:** https://authjs.dev/getting-started/adapters/prisma

Create a singleton Prisma instance to avoid recreating connections:

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma || new PrismaClient().$extends(withAccelerate())

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

**Note:** If not using Prisma Postgres with Accelerate, omit the `withAccelerate()` extension.

### Auth.js Configuration with Prisma Adapter

**Source:** https://authjs.dev/getting-started/adapters/prisma

```typescript
// auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [],
})
```

### Required Prisma Schema Models

**Source:** https://authjs.dev/getting-started/adapters/prisma

The following models are required for the Prisma adapter:

```prisma
// prisma/schema.prisma
model Account {
  id                 String  @id @default(cuid())
  userId             String  @map("user_id")
  type               String
  provider           String
  providerAccountId  String  @map("provider_account_id")
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  accounts      Account[]
  sessions      Session[]

  @@map("users")
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

**Source:** https://authjs.dev/concepts/database-models

These models can be extended with additional fields. For the HMS, you'll need to add a `role` field to the User model (covered in section 3).

### JWT vs Database Session Strategy for Role-Based Access

**Source:** https://authjs.dev/concepts/session-strategies

**JWT Session Strategy:**
- Default when no adapter is configured
- Encrypted JWT (JWE) stored in HttpOnly cookie
- No database lookup required per request (faster, cheaper, easier to scale)
- Cannot revoke sessions before expiration (requires blocklist)
- **Recommended for HMS with Credentials provider** (see section 2)

**Database Session Strategy:**
- Default when adapter is configured
- Session stored in database, cookie contains only sessionToken
- Database query required per request
- Can revoke sessions instantly by deleting the row
- More control over session data

**Critical for HMS:** The Credentials provider **only works with JWT strategy**. If you use an adapter (which defaults to database strategy), you must explicitly set `session: { strategy: "jwt" }` [Source: https://authjs.dev/reference/core/providers/credentials]

**Source:** https://dev.to/hirodeath/nextauth-v5-sessions-jwt-or-database-untangling-the-adapter-driven-switch-with-a-production-config-43kl

> "The Credentials provider does not create database sessions, so it requires an explicit `strategy: 'jwt'`"

**Recommendation for HMS:** Use JWT strategy with adapter for user persistence, but JWT for sessions to support Credentials provider and improve performance.

---

## 2. Credential-Based Login (Email + Password)

### Credentials Provider Setup

**Source:** https://authjs.dev/getting-started/providers/credentials

```typescript
// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          type: "email",
          label: "Email",
          placeholder: "johndoe@gmail.com",
        },
        password: {
          type: "password",
          label: "Password",
          placeholder: "*****",
        },
      },
      async authorize(credentials) {
        // Your authentication logic here
        // Return user object or null
      },
    }),
  ],
})
```

### Password Hashing with bcrypt

**Source:** https://authjs.dev/getting-started/authentication/credentials

Auth.js does not include password hashing logic. You must implement it yourself. The official docs recommend using bcrypt or bcryptjs:

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Password hashing utility:**

```typescript
// lib/password.ts
import bcrypt from "bcryptjs"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
```

**Complete authorize function with bcrypt:**

```typescript
// auth.ts
import { getUserByEmail } from "@/lib/user"
import { verifyPassword } from "@/lib/password"

Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null
    }

    const user = await getUserByEmail(credentials.email as string)
    
    if (!user || !user.password) {
      return null
    }

    const isValid = await verifyPassword(
      credentials.password as string,
      user.password
    )

    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  },
})
```

### Credentials Provider with Database Sessions

**Source:** https://authjs.dev/reference/core/providers/credentials

> "It comes with the constraint that users authenticated in this manner are not persisted in the database, and consequently that the Credentials provider can only be used if JSON Web Tokens are enabled for sessions."

**Answer:** No, the Credentials provider is **not fully supported with database sessions**. You must use JWT strategy when using Credentials provider.

**Configuration:**

```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Required for Credentials provider
  providers: [
    Credentials({ /* ... */ }),
  ],
})
```

---

## 3. Role Field in Session

### Extend User Model with Role Enum

**Source:** https://authjs.dev/guides/role-based-access-control

Add a role field to the User model in your Prisma schema:

```prisma
// prisma/schema.prisma
enum UserRole {
  ADMIN
  DOCTOR
  PATIENT
  RECEPTIONIST
  LAB_TECHNICIAN
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  role          UserRole  @default(PATIENT)
  password      String?   // For credentials provider
  accounts      Account[]
  sessions      Session[]

  @@map("users")
}
```

### Expose Role in Session via Callbacks

**Source:** https://authjs.dev/guides/role-based-access-control

**For JWT Strategy (Recommended for HMS):**

```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      // ... configuration
      async authorize(credentials) {
        // ... authentication logic
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // Include role in returned user object
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
})
```

**For Database Strategy:**

```typescript
callbacks: {
  session({ session, user }) {
    session.user.role = user.role
    return session
  },
}
```

### TypeScript: Extend Session Type

**Source:** https://authjs.dev/getting-started/typescript

Create a type definition file to extend the Session type:

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"
import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
  }
}
```

**Source:** https://authjs.dev/guides/extending-the-session

The `jwt` callback is called before the `session` callback when using JWT strategy. You must add custom parameters to the token via the `jwt()` callback to make them accessible in the `session()` callback.

---

## 4. Middleware-Based Route Protection

### Next.js 16+ Proxy (Middleware)

**Source:** https://authjs.dev/getting-started/session-management/protecting

As of Next.js 16, `middleware.ts` has been renamed to `proxy.ts` and the exported function has been renamed from `middleware` to `proxy`. For older Next.js versions, use `middleware.ts` and export `auth` as `middleware`.

**Source:** https://authjs.dev/getting-started/migrating-to-v5

### Configuration Split for Edge Compatibility

**Source:** https://authjs.dev/getting-started/migrating-to-v5

Since Prisma is not edge-compatible by default, split your configuration:

**auth.config.ts** (edge-compatible, used by proxy):

```typescript
// auth.config.ts
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      }
      return true
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig
```

**auth.ts** (full config with adapter):

```typescript
// auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import authConfig from "./auth.config"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    // Add providers here
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Add additional callbacks for role, etc.
  },
})
```

**proxy.ts** (or middleware.ts for Next.js < 16):

```typescript
// proxy.ts
import authConfig from "./auth.config"
import NextAuth from "next-auth"

const { auth } = NextAuth(authConfig)

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Unauthenticated: redirect to login
  if (!session && pathname.startsWith("/dashboard")) {
    return Response.redirect(new URL("/login", req.url))
  }

  // Admin-only routes
  if (pathname.startsWith("/dashboard/admin")) {
    if (session?.user.role !== "ADMIN") {
      return Response.redirect(new URL("/dashboard", req.url))
    }
  }

  // Doctor-only routes
  if (pathname.startsWith("/dashboard/doctor")) {
    if (session?.user.role !== "DOCTOR") {
      return Response.redirect(new URL("/dashboard", req.url))
    }
  }

  // Patient-only routes
  if (pathname.startsWith("/dashboard/patient")) {
    if (session?.user.role !== "PATIENT") {
      return Response.redirect(new URL("/dashboard", req.url))
    }
  }

  // Receptionist-only routes
  if (pathname.startsWith("/dashboard/receptionist")) {
    if (session?.user.role !== "RECEPTIONIST") {
      return Response.redirect(new URL("/dashboard", req.url))
    }
  }

  // Lab Technician-only routes
  if (pathname.startsWith("/dashboard/lab")) {
    if (session?.user.role !== "LAB_TECHNICIAN") {
      return Response.redirect(new URL("/dashboard", req.url))
    }
  }

  return Response.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

**Source:** https://authjs.dev/getting-started/session-management/protecting

You can also use the simpler approach:

```typescript
// proxy.ts
export { auth as proxy } from "@/auth"
```

And define the `authorized` callback in `auth.config.ts` as shown above.

### Role-Based Route Protection Pattern

**Source:** https://authjs.dev/guides/role-based-access-control

For more complex role checks, use the wrapped proxy approach:

```typescript
// proxy.ts
import { auth } from "@/auth"

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Define role-based route protection
  const roleRoutes = {
    "/admin": ["ADMIN"],
    "/doctor": ["DOCTOR"],
    "/patient": ["PATIENT"],
    "/receptionist": ["RECEPTIONIST"],
    "/lab": ["LAB_TECHNICIAN"],
  }

  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      if (!session) {
        return Response.redirect(new URL("/login", req.url))
      }
      if (!allowedRoles.includes(session.user.role)) {
        return Response.redirect(new URL("/unauthorized", req.url))
      }
    }
  }

  return Response.next()
})
```

---

## 5. Admin Seeding

### Prisma Seed Script Approach

**Source:** https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding

**Step 1: Create seed script**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Hash password
  const hashedPassword = await bcrypt.hash("admin123", 10)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@hms.com" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      email: "admin@hms.com",
      name: "System Administrator",
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  })

  console.log("✅ Admin user created:", admin.email)
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 2: Configure prisma.config.ts**

**Source:** https://www.prisma.io/docs/orm/reference/prisma-config-reference

```typescript
// prisma.config.ts
import "dotenv/config"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
```

**Step 3: Install dependencies**

```bash
npm install --save-dev tsx @types/node
```

**Step 4: Run seed**

```bash
npx prisma db seed
```

### Best Practices for Admin Seeding

1. **Use upsert** to handle both initial creation and updates
2. **Hash passwords** using bcrypt with a salt rounds of 10-12
3. **Set emailVerified** to avoid email verification for seeded users
4. **Use environment variables** for sensitive data (passwords, emails)
5. **Create multiple seed users** for testing different roles

**Example with multiple roles:**

```typescript
// prisma/seed.ts
async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10)

  const users = [
    {
      email: "admin@hms.com",
      name: "System Administrator",
      role: "ADMIN",
    },
    {
      email: "doctor@hms.com",
      name: "Dr. John Smith",
      role: "DOCTOR",
    },
    {
      email: "receptionist@hms.com",
      name: "Jane Doe",
      role: "RECEPTIONIST",
    },
    {
      email: "lab@hms.com",
      name: "Lab Technician",
      role: "LAB_TECHNICIAN",
    },
  ]

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: hashedPassword,
        role: userData.role,
      },
      create: {
        ...userData,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    })
  }

  console.log("✅ All seed users created")
}
```

---

## 6. Session Configuration

### Session Timeout / MaxAge Settings

**Source:** https://authjs.dev/reference/core

Configure session timeout using the `maxAge` option:

```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    strategy: "jwt",
  },
})
```

**Common maxAge values:**
- 1 hour: `60 * 60`
- 1 day: `24 * 60 * 60`
- 1 week: `7 * 24 * 60 * 60`
- 30 days: `30 * 24 * 60 * 60`

### Session Update Age

**Source:** https://authjs.dev/reference/core

The `updateAge` option controls how often the session should be updated:

```typescript
session: {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 1 day - update session every day
}
```

If set to `0`, the session is updated every time.

### Session Rotation

**Source:** https://authjs.dev/concepts/session-strategies

Auth.js v5 includes automatic session token rotation for JWT sessions:

> "Auth.js enables advanced features to mitigate the downsides of using shorter session expiry times on the user experience, including automatic session token rotation, optionally sending keep-alive messages (session polling) to prevent short-lived sessions from expiring if there is a window or tab open, background re-validation, and automatic tab/window syncing that keeps sessions in sync across windows any time session state changes or a window or tab gains or loses focus."

**Note:** Session rotation happens automatically when the JWT is nearing expiration and `auth()` is called. This is a built-in feature and does not require manual configuration.

**Source:** https://github.com/nextauthjs/next-auth/issues/13224

> "Apparently V5 automatically renews / rotates the JWT session cookie when it's nearing expiration when calling auth()."

### Recommended Session Configuration for HMS

```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours - appropriate for hospital shifts
    updateAge: 60 * 60, // Update every hour
  },
})
```

**Rationale:** 
- 8-hour session matches typical hospital shift length
- Forces re-authentication between shifts for security
- 1-hour update age balances performance and security

---

## 7. Supabase PostgreSQL Integration

### Environment Configuration

**Source:** https://authjs.dev/getting-started/adapters/prisma

Set up your `.env` file with Supabase connection string:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**Source:** https://dev.to/heinhtoo/implementing-authjs-v5-with-prisma-and-supabase-in-nextjs-lie

Note: Prisma doesn't work with `.env.local` - it only works with `.env`. Make sure to use the correct file.

### Prisma Schema for Supabase

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add Auth.js models here (from section 1)
// Add HMS-specific models with role enum
```

### Run Migrations

```bash
npx prisma migrate dev --name init
```

For production:

```bash
npx prisma migrate deploy
```

---

## 8. Complete HMS Auth Configuration Example

### File Structure

```
/
├── auth.config.ts          # Edge-compatible config
├── auth.ts                 # Full config with adapter
├── proxy.ts                # Middleware (Next.js 16+) or middleware.ts (Next.js < 16)
├── lib/
│   ├── prisma.ts           # Prisma singleton
│   ├── password.ts         # Password hashing utilities
│   └── user.ts             # User queries
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seed script
│   └── config.ts           # Prisma config
├── types/
│   └── next-auth.d.ts      # TypeScript extensions
└── .env                    # Environment variables
```

### Complete auth.config.ts

```typescript
// auth.config.ts
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAuthPage = nextUrl.pathname.startsWith("/auth")
      
      if (isOnAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
        return true
      }

      if (!isLoggedIn) {
        return false
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
```

### Complete auth.ts

```typescript
// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { getUserByEmail } from "@/lib/user"
import { verifyPassword } from "@/lib/password"
import authConfig from "./auth.config"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // 1 hour
  },
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await getUserByEmail(credentials.email as string)
        
        if (!user || !user.password) {
          return null
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
})
```

### Complete proxy.ts

```typescript
// proxy.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  const publicRoutes = ["/", "/login", "/auth/error"]
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Unauthenticated users
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Role-based route protection
  const roleRoutes: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/doctor": ["DOCTOR"],
    "/patient": ["PATIENT"],
    "/receptionist": ["RECEPTIONIST"],
    "/lab": ["LAB_TECHNICIAN"],
  }

  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

---

## 9. Environment Variables

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Auth.js
AUTH_SECRET="[GENERATE_WITH: npx auth secret]"
AUTH_URL="http://localhost:3000"

# Optional: For OAuth providers (if needed later)
# AUTH_GOOGLE_ID=""
# AUTH_GOOGLE_SECRET=""
```

**Generate AUTH_SECRET:**

```bash
npx auth secret
```

**Source:** https://authjs.dev/getting-started/installation

---

## 10. API Route Handler

### Create API Route for Auth Handlers

**Source:** https://authjs.dev/getting-started/installation

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

This handles all Auth.js endpoints including sign-in, sign-out, and callback URLs.

---

## 11. Key Takeaways for HMS Implementation

1. **Use JWT strategy** with Prisma adapter to support Credentials provider
2. **Split configuration** into `auth.config.ts` (edge) and `auth.ts` (full) for middleware compatibility
3. **Extend User model** with role enum for HMS roles
4. **Use TypeScript module augmentation** to add role to Session type
5. **Implement role-based middleware** to protect routes by role
6. **Seed admin user** with Prisma seed script using bcrypt
7. **Configure session timeout** to 8 hours for hospital shift context
8. **Use Next.js 16+ proxy.ts** or Next.js < 16 middleware.ts for route protection
9. **Store passwords** with bcrypt (10-12 salt rounds)
10. **Use Supabase PostgreSQL** connection string in DATABASE_URL

---

## 12. Official Documentation Sources

All information in this document is sourced from official documentation:

1. **Auth.js Prisma Adapter:** https://authjs.dev/getting-started/adapters/prisma
2. **Auth.js Database Models:** https://authjs.dev/concepts/database-models
3. **Auth.js Session Strategies:** https://authjs.dev/concepts/session-strategies
4. **Auth.js Credentials Provider:** https://authjs.dev/getting-started/providers/credentials
5. **Auth.js Credentials Authentication:** https://authjs.dev/getting-started/authentication/credentials
6. **Auth.js Role-Based Access Control:** https://authjs.dev/guides/role-based-access-control
7. **Auth.js TypeScript:** https://authjs.dev/getting-started/typescript
8. **Auth.js Extending Session:** https://authjs.dev/guides/extending-the-session
9. **Auth.js Protecting Routes:** https://authjs.dev/getting-started/session-management/protecting
10. **Auth.js Core Reference:** https://authjs.dev/reference/core
11. **Auth.js Migrating to v5:** https://authjs.dev/getting-started/migrating-to-v5
12. **Prisma Seeding:** https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
13. **Prisma Seed Command:** https://www.prisma.io/docs/cli/db/seed
14. **Prisma Config Reference:** https://www.prisma.io/docs/orm/reference/prisma-config-reference
15. **Prisma Auth.js Guide:** https://www.prisma.io/docs/guides/authentication/authjs/nextjs

---

## 13. Next Steps for Implementation

1. Set up Supabase PostgreSQL database
2. Initialize Prisma with `npx prisma init`
3. Configure `prisma/schema.prisma` with Auth.js models and HMS role enum
4. Run `npx prisma migrate dev --name init`
5. Install dependencies: `npm install next-auth@beta @auth/prisma-adapter @prisma/client prisma bcryptjs`
6. Create auth configuration files (`auth.config.ts`, `auth.ts`)
7. Create TypeScript extensions (`types/next-auth.d.ts`)
8. Create utility files (`lib/prisma.ts`, `lib/password.ts`, `lib/user.ts`)
9. Create seed script (`prisma/seed.ts`)
10. Configure `prisma.config.ts` with seed command
11. Run seed script: `npx prisma db seed`
12. Create API route handler (`app/api/auth/[...nextauth]/route.ts`)
13. Create middleware/proxy (`proxy.ts` or `middleware.ts`)
14. Set up environment variables
15. Test authentication flow

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-09  
**Auth.js Version:** v5 (NextAuth.js v5)  
**Prisma Version:** 5.x  
**Next.js Version:** 14+ (App Router)