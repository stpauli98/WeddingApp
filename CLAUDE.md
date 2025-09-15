# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WeddingApp** - A SaaS application for collecting photos from wedding guests. Guests register with name, email, receive verification codes, and can upload up to 10 photos with messages. Admins (wedding couples) can create events, generate QR codes/URLs, and review submitted photos and messages.

**Domain**: www.dodajuspomenu.com

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API routes with PostgreSQL (Prisma ORM)
- **Email**: Nodemailer with Resend
- **Image Upload**: Cloudinary
- **Internationalization**: i18next with Serbian (sr) and English (en) support
- **Package Manager**: pnpm

## Common Development Commands

```bash
# Development
pnpm dev                    # Start development server

# Testing
pnpm test:unit             # Run unit tests
pnpm test:integration      # Run integration tests
npx playwright test        # Run E2E tests

# Building
pnpm build                 # Build production version
pnpm start                 # Start production server

# Code Quality
pnpm lint                  # Run ESLint
pnpm audit                 # Security audit

# Database
npx prisma migrate dev     # Run migrations in development
npx prisma studio          # Open Prisma Studio
npx prisma generate        # Generate Prisma Client
```

## Architecture & Structure

### Directory Layout
```
/app                       # Next.js App Router pages
  /api                    # API routes (guest, admin, feedback)
  /admin                  # Admin dashboard pages
  /guest                  # Guest pages (registration, upload)
  /en, /sr               # Internationalized routes
/components               # React components
  /ui                    # Shadcn/ui components
  /admin                 # Admin-specific components
  /guest                 # Guest-specific components
  /landingPage          # Landing page components
/lib                     # Utilities and configurations
  /context              # React contexts
  /i18n                 # Internationalization config
/prisma                  # Database schema and migrations
/public                  # Static assets
/locales                # Translation files (sr/en)
/styles                 # Global styles and theme
/claudedocs            # Claude-specific documentation
```

### Key Architectural Patterns

1. **Multi-tenancy via Event Slugs**: Each wedding event has a unique slug (e.g., `/guest/{slug}`) that isolates guest data
2. **Two-tier Authentication**:
   - Guests: Email verification code system (6-digit codes, 10-minute expiry)
   - Admins: Password-based authentication with session tokens
3. **Internationalization**: URL-based language routing (`/sr/*`, `/en/*`) with middleware handling
4. **CSRF Protection**: Custom implementation in `/lib/csrf.ts` for API security

### Database Schema

**Core Models**:
- `Event`: Wedding events with slug, date, location
- `Guest`: Event attendees with email verification
- `Admin`: Event owners with password auth
- `Image`: Guest-uploaded photos (max 10 per guest)
- `Message`: Guest congratulatory messages
- `AdminSession`: Admin authentication sessions

### API Route Organization

```
/api/guest/
  - register: Guest email registration
  - verify: Code verification
  - upload: Photo upload handler
  - images: Fetch guest images
/api/admin/
  - login, logout: Authentication
  - events: Event CRUD operations
  - guests: Guest management
  - download-images: Bulk image download
```

## Important Implementation Details

### Security & Privacy
- **Data Isolation**: Strict event-based data separation
- **Image Privacy**: Cloudinary uploads use secure tokens
- **Session Management**: 24-hour admin sessions, 30-day guest sessions
- **CSRF Protection**: Token validation on state-changing operations

### UI/UX Guidelines
- **Language**: Serbian (ijekavica) as default, English as secondary
- **Images**: Always use Next.js `<Image />` component for optimization
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **User Feedback**: Clear success/error messages using Sonner toasts

### Code Style & Conventions
- **TypeScript**: Strict mode enabled, avoid `any` types
- **Components**: Functional components with hooks
- **Naming**: 
  - Components: PascalCase
  - Functions/variables: camelCase
  - API routes: kebab-case
- **Imports**: Use absolute imports from `@/` prefix
- **Error Handling**: Graceful degradation with user-friendly messages

### Testing Approach
- **Unit Tests**: Jest with React Testing Library for components
- **Integration Tests**: API route testing with Supertest
- **E2E Tests**: Playwright for critical user flows

### Performance Optimizations
- **Image Optimization**: Cloudinary transformations for different sizes
- **Code Splitting**: Dynamic imports for heavy components
- **Database Queries**: Prisma query optimization with selective includes
- **PWA Support**: Service worker for offline functionality

## Development Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Implement with appropriate tests
   - Ensure TypeScript types are correct
   - Run `pnpm lint` before committing

2. **Database Changes**:
   - Modify `prisma/schema.prisma`
   - Run `npx prisma migrate dev` to create migration
   - Update relevant API routes and types

3. **Adding Translations**:
   - Update `/locales/sr/*.json` and `/locales/en/*.json`
   - Use `t()` function from react-i18next in components

4. **Image Upload Flow**:
   - Guest uploads → Cloudinary → Store URL in database
   - Max file size: 10MB per image
   - Supported formats: jpg, jpeg, png, gif, webp

## Environment Variables

Required in `.env`:
```
DATABASE_URL          # PostgreSQL connection string
CLOUDINARY_CLOUD_NAME # Cloudinary account
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
RESEND_API_KEY       # Email service
NEXTAUTH_SECRET      # Session encryption
NEXT_PUBLIC_APP_URL  # Application URL
```

## Common Troubleshooting

- **Prisma Issues**: Run `npx prisma generate` after schema changes
- **Build Errors**: Check TypeScript errors with `npx tsc --noEmit`
- **Image Upload Fails**: Verify Cloudinary credentials and quota
- **Email Not Sending**: Check Resend API key and domain verification