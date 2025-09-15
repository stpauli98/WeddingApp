# Security Configuration

## CSRF Protection

This application requires proper CSRF protection configuration for security.

### Setup Instructions

1. **Generate a CSRF Secret**
   ```bash
   node scripts/generate-csrf-secret.js
   ```

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```

3. **Add the generated secret to your .env file**
   ```
   CSRF_SECRET=<your-generated-secret>
   ```

### Important Security Notes

- **Never commit secrets**: The .env file should never be committed to version control
- **Use different secrets**: Development and production environments must use different secrets
- **Secure storage**: Production secrets should be stored in secure environment variables (e.g., Vercel, Heroku, AWS Secrets Manager)
- **Regular rotation**: Rotate CSRF secrets periodically for enhanced security

### What happens without CSRF_SECRET?

The application will **refuse to start** and throw a critical security error if the CSRF_SECRET environment variable is not set. This is by design to prevent accidental deployment without proper CSRF protection.

### Environment Variables

All required environment variables are documented in `.env.example`. Critical variables include:

- `CSRF_SECRET` - Required for CSRF protection
- `DATABASE_URL` - Database connection string
- `CLOUDINARY_*` - Required for image upload functionality
- `EMAIL_*` - Required for email-based guest login

### Security Best Practices

1. **Strong Passwords**: Admin passwords must be at least 8 characters with complexity requirements
2. **Session Security**: Sessions expire after inactivity and are properly invalidated on logout
3. **File Upload Validation**: Only image files are accepted with proper MIME type validation
4. **Rate Limiting**: API endpoints are protected with rate limiting
5. **Input Validation**: All user inputs are validated and sanitized

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the public issue tracker.