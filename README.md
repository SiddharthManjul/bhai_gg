# Bhai.gg - Community Platform

A community platform for Bhai Cabal members featuring world map views, event management with GPS-verified attendance, NFT badges, and more.

## Features Implemented (Day 1 MVP)

✅ Next.js 15 with App Router
✅ TypeScript
✅ Tailwind CSS + shadcn/ui
✅ Prisma ORM with PostgreSQL
✅ NextAuth.js email authentication (magic links)
✅ Email verification with Resend
✅ User profile creation form
✅ Protected routes with middleware

## Setup Instructions

### 1. Prerequisites

- **Node.js 20+** or **Bun** (this project uses Bun)
- **NeonDB account** (free tier available at [neon.tech](https://neon.tech))
- **Resend account** (free tier available at [resend.com](https://resend.com))

### 2. Database Setup (NeonDB)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project called `bhai_gg`
3. Copy your connection string (looks like: `postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require`)
4. Paste it into your `.env` file as `DATABASE_URL`

### 3. Email Setup (Resend)

1. Go to [resend.com](https://resend.com) and create a free account
2. Add and verify your domain (or use the provided testing domain)
3. Create an API key
4. Paste it into your `.env` file as `RESEND_API_KEY`

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Update `.env` with your actual values:

```env
# Database (NeonDB PostgreSQL)
DATABASE_URL="your-neon-connection-string-here"

# NextAuth
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Resend (Email)
RESEND_API_KEY="re_your_api_key_here"

# Email sender
EMAIL_FROM="noreply@yourdomain.com"
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Install Dependencies

```bash
bun install
```

### 6. Setup Database

Generate Prisma Client and run migrations:

```bash
# Generate Prisma Client
bunx prisma generate

# Push schema to database (for development)
bunx prisma db push

# OR run migrations (for production)
bunx prisma migrate dev --name init
```

### 7. Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### First Time Sign In

1. Go to [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to the sign-in page
3. Enter your email address
4. Check your email for the magic link
5. Click the link to verify and sign in
6. Complete your profile setup (name and city are required)
7. You're now signed in!

### Create Admin User

To give a user admin privileges:

```bash
bunx prisma studio
```

1. Open Prisma Studio (runs on http://localhost:5555)
2. Navigate to the `User` table
3. Find your user
4. Change the `role` field from `CONTRIBUTOR` to `ADMIN`
5. Save changes

## Project Structure

```
bhai-gg/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth API route
│   │   └── profile/setup/route.ts       # Profile setup API
│   ├── auth/
│   │   ├── signin/page.tsx              # Sign in page
│   │   ├── verify-request/page.tsx      # Email sent confirmation
│   │   └── error/page.tsx               # Auth error page
│   ├── profile/
│   │   └── setup/page.tsx               # Profile setup form
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Homepage
│   └── globals.css                      # Global styles
├── components/ui/                       # shadcn components
├── lib/
│   ├── auth.ts                         # NextAuth configuration
│   ├── db.ts                           # Prisma client
│   └── utils.ts                        # Utility functions
├── prisma/
│   └── schema.prisma                   # Database schema
├── middleware.ts                       # Route protection
├── .env                                # Environment variables (not in git)
├── .env.example                        # Example env file
└── README.md                           # This file
```

## Database Schema

Current models:

- **User** - User profiles with location, social links, and role
- **Account** - NextAuth account data
- **Session** - NextAuth session data
- **VerificationToken** - Email verification tokens

See `prisma/schema.prisma` for full schema details.

## Useful Commands

```bash
# Run development server
bun dev

# Build for production
bun run build

# Start production server
bun start

# Open Prisma Studio (database GUI)
bunx prisma studio

# Generate Prisma Client
bunx prisma generate

# Push schema changes to database
bunx prisma db push

# Create and run migrations
bunx prisma migrate dev

# Format Prisma schema
bunx prisma format

# Reset database (⚠️ deletes all data)
bunx prisma migrate reset
```

## Next Steps (Day 2-3 MVP)

Refer to `CLAUDE.md` for the full build timeline. Next features to implement:

- [ ] Directory page with user list
- [ ] Search and filters (country, city)
- [ ] World map integration (Mapbox/Leaflet)
- [ ] User pins on map (city-level only)
- [ ] Admin dashboard with basic stats

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run:
```bash
bunx prisma generate
```

### Database connection errors

1. Check your `DATABASE_URL` in `.env`
2. Ensure your NeonDB database is active
3. Make sure the connection string includes `?sslmode=require`

### Email not sending

1. Verify your Resend API key is correct
2. Check that `EMAIL_FROM` matches a verified domain in Resend
3. Check Resend dashboard for logs

### "Middleware is not a function" error

Make sure you're using Next.js 15+ and NextAuth v5 (beta).

## Contributing

This is an internal project for Bhai Cabal. Follow the guidelines in `CLAUDE.md`.

## License

Private - All rights reserved