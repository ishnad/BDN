# OWASP Top 10 Quick Checklist

## A01 — Broken Access Control
- [ ] All routes require authentication where appropriate
- [ ] Object-level authorization checked on every data access (not just route-level)
- [ ] No privilege escalation via parameter manipulation (e.g., changing `userId` in a request)
- [ ] Directory traversal not possible through file-serving routes

## A02 — Cryptographic Failures
- [ ] No sensitive data (passwords, tokens, PII) transmitted in plain text
- [ ] Passwords hashed with bcrypt / argon2 (not MD5 or SHA-1)
- [ ] TLS enforced in production; HTTP redirects to HTTPS
- [ ] Secrets not stored in code or version control

## A03 — Injection
- [ ] All database queries use parameterized statements / ORMs (no string interpolation)
- [ ] User input never interpolated directly into shell commands
- [ ] HTML output escaped to prevent XSS
- [ ] File upload types validated server-side (not just client-side)

## A05 — Security Misconfiguration
- [ ] Debug mode / verbose errors disabled in production
- [ ] Default credentials changed on all services
- [ ] Only necessary ports/services exposed
- [ ] Error responses don't leak stack traces or internal paths to end users
- [ ] CORS policy is explicit and restrictive

## A07 — Identification & Authentication Failures
- [ ] Session tokens are long, random, and rotated after login
- [ ] Brute-force / rate limiting on login and password-reset endpoints
- [ ] Secure cookie flags set: `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] Multi-factor authentication available for privileged accounts
- [ ] Logout properly invalidates server-side session
