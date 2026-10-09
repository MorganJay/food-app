# Production Infrastructure Recommendation

## Decision summary

If I were technical lead for this startup, I would choose:

- Backend hosting: Render
- Database: MongoDB Atlas
- Media storage: Cloudinary
- Messaging: Infobip
- Payments: Paystack
- Monitoring: Render logs + UptimeRobot + Sentry
- Environment strategy: development + production initially; add staging only if release risk warrants it
- Estimated budget: £120–£220/month

---

## 1) What the codebase currently requires

From the repository, the production stack is a single NestJS API with MongoDB at its core.

Verified runtime dependencies:

- NestJS 10 app in [package.json](package.json)
- MongoDB connection via Mongoose in [src/app.module.ts](src/app.module.ts)
- JWT and Passport auth in [src/auth/auth.module.ts](src/auth/auth.module.ts)
- Socket.IO order events in [src/orders/orders.gateway.ts](src/orders/orders.gateway.ts)
- Cloudinary image uploads in [src/common/config/cloudinary.config.ts](src/common/config/cloudinary.config.ts) and [src/common/utils/cloudinary.util.ts](src/common/utils/cloudinary.util.ts)
- Infobip OTP/SMS/email/WhatsApp in [src/auth/sms/infobip.provider.ts](src/auth/sms/infobip.provider.ts)
- Paystack payment flow in [src/payments/payments.service.ts](src/payments/payments.service.ts)
- Swagger and throttling in [src/main.ts](src/main.ts) and [src/app.module.ts](src/app.module.ts)

Important findings:

- No Redis is used in the repo.
- No BullMQ, Kafka, RabbitMQ, or queue worker infrastructure is present.
- No cron jobs or schedule module are present.
- The app is a single API service with real-time order updates, not a microservice architecture.

---

## 2) Recommended architecture

### Recommended production stack

- App host: Render production web service
- Database: MongoDB Atlas dedicated cluster
- File/media storage: Cloudinary
- SMS/email: Infobip
- Payments: Paystack
- Monitoring: Render logs + UptimeRobot + Sentry
- Deployment: GitHub Actions → Render
- Secrets: environment variables managed in the platform, never committed to source control

This is the simplest startup-friendly production deployment that still meets reliability and safety expectations.

---

## 3) Why this is the right choice

### Render for the API

Render is a strong fit because the app is a standard Node/NestJS service and it supports the real-time WebSocket requirements of the order gateway.

Advantages:

- low operational burden
- straightforward deployment
- health checks and logs built in
- good fit for a startup team without infrastructure specialists
- easier than managing a VM or container fleet

### MongoDB Atlas instead of self-hosted MongoDB

MongoDB Atlas is the better choice at launch because it reduces engineering risk.

A self-hosted MongoDB VM might save a few pounds per month, but it adds:

- VM maintenance
- disk management
- backups and restore testing
- monitoring and alerts
- patching and security hardening
- operational risk during outages

For a startup, this is usually not worth the small savings.

---

## 4) Realistic monthly cost (GBP)

| Component                 | Estimated monthly cost |
| ------------------------- | ---------------------: |
| Render production service |                £20–£60 |
| MongoDB Atlas             |                £45–£90 |
| Cloudinary                |                 £5–£25 |
| Infobip                   |                 £5–£30 |
| UptimeRobot / monitoring  |                 £0–£15 |
| Sentry                    |                 £0–£20 |
| Extra backup/storage      |                 £5–£20 |
| Domain/TLS/minor overhead |                 £0–£10 |
| Total                     |               £80–£250 |

### Recommended budget

£120–£220/month

This is the range I would budget for public launch.

---

## 5) Scenario comparison

### Scenario A — Cheapest viable production

- Render small production service
- Atlas small cluster
- minimal monitoring
- basic backups
- dev + prod only

Estimated cost: £70–£130/month

### Scenario B — Recommended startup production

- Render standard service
- Atlas dedicated cluster
- monitoring and backups in place
- basic production hardening

Estimated cost: £120–£220/month

### Scenario C — Growth-ready production

- larger Atlas cluster
- more monitoring and retention
- stronger staging controls
- higher availability posture

Estimated cost: £220–£450+/month

---

## 6) Required production security controls

Minimum requirements:

- Never store secrets in source control
- Use Render or platform secret stores for environment variables
- Keep these secrets protected:
  - MONGO_URI
  - JWT_SECRET
  - PAYSTACK_SECRET_KEY
  - INFOBIP_API_KEY
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET
  - any delivery-partner credentials
- HTTPS only
- restrictive CORS policy
- JWT rotation procedure
- MongoDB user auth enabled
- database network restrictions enabled
- logs must not leak secrets
- admin routes should remain role-guarded

---

## 7) Backup and disaster recovery

### Required posture

- Atlas backups enabled
- PITR if available on configured tier
- retention policy of at least 7 days, preferably longer
- restore test before public launch

### RTO / RPO

- RPO: low, ideally minutes to a few hours
- RTO: under 1–2 hours if a restore is needed

This protects against:

- accidental deletion
- data corruption
- infrastructure failure
- human error
- provider incident

---

## 8) Monitoring strategy

Minimum viable production monitoring:

- Render application logs
- Render health checks
- UptimeRobot for external availability
- Sentry for error capture
- MongoDB Atlas monitoring

This is enough for a startup without overbuilding observability.

---

## 9) Environment strategy

Recommended approach:

- Development
- Production

Only add staging if release risk becomes significant.

Why not always-on three environments?

- extra cost
- more operational overhead
- not justified for a small startup launch

---

## 10) Deployment flow

Recommended deployment process:

GitHub → GitHub Actions → build → run tests → deploy to Render → health check → production

This fits the codebase and keeps the release process simple.

---

## 11) Migration notes

If you keep the app on Render and move MongoDB to Atlas:

1. Create Atlas cluster
2. import or sync data
3. update MONGO_URI in production env
4. deploy app with new env vars
5. validate auth, payments, and webhooks
6. switch live traffic
7. keep the previous deployment and credentials as rollback safety

Expected downtime should be minimal if done carefully, but a short maintenance window is sensible during the cutover.

---

## 12) Final recommendation in one sentence

For this codebase, I would keep the NestJS API on Render, run MongoDB on Atlas, retain Cloudinary and Infobip, add basic production monitoring and backups, and budget roughly £120–£220/month for launch.

---

## 13) Production env template

Use the provided `.env.example` file as the starting point for required variables.
