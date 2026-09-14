# Shared Whiteboard Implementation Plan

## Objective

Allow a user to publish a read-only snapshot of a whiteboard at a unique public URL.

Each anonymous browser may own multiple shared whiteboards, but each whiteboard must have exactly one active share link for that owner.

Publishing the same whiteboard again updates its existing link instead of creating another record.

Links expire 30 days after the latest successful owner update.

Sharing must remain isolated from the local canvas and AI generation paths.

If the database, CAPTCHA provider, quota system, cleanup job, or entire sharing feature fails, users must still be able to create and use dashboards locally.

## Success criteria

- Every whiteboard has at most one active link per anonymous owner.
- Updating a shared whiteboard preserves its public URL.
- Resetting a link immediately invalidates the previous URL.
- Links expire 30 days after creation or the latest owner update.
- Anonymous owners can hold at most five active shared whiteboards.
- Snapshot size, request rate, owner quota, and global capacity limits are enforced atomically.
- Public visitors cannot mutate shared whiteboards.
- Sharing infrastructure failures never prevent local dashboard use.
- Every critical path has integration and end-to-end coverage.

## Product behavior

### First share

1. The user clicks `Share`.
2. The app verifies that the whiteboard is stable and shareable.
3. The user completes Cloudflare Turnstile verification.
4. The server creates or resolves an anonymous owner cookie.
5. The server stores a validated read-only snapshot.
6. The server returns a unique URL such as `https://example.com/shared/Fm7kP2xQ9cW4nRtB`.
7. The Share dialog displays the URL and its exact expiration date.

The dialog must explain that anyone with the link can view the whiteboard.

### Publishing the same whiteboard again

The server finds an existing share using the anonymous owner hash and local board ID.

If the share already exists, the server must:

- Preserve the public URL.
- Replace the stored snapshot.
- Increment the snapshot version.
- Reset expiration to 30 days from the successful update.
- Invalidate the cached public view.

The database must enforce this behavior with a unique constraint so double-clicks, retries, and concurrent tabs cannot create duplicate links.

### Unchanged publication

The server calculates a canonical content hash for every valid snapshot.

If the incoming hash matches the stored hash, the server avoids rewriting the JSON payload.

The response reports `unchanged`, and the deliberate Share action renews the expiry.

### Reset link

`Reset link` is a separate destructive action that requires confirmation and Turnstile verification.

Resetting a link must:

- Generate a new public slug.
- Immediately invalidate the old URL and its cache entry.
- Preserve the internal database record and ownership.
- Preserve the snapshot unless the user is simultaneously publishing an update.
- Reset expiration to 30 days.

### Delete link

Deleting a link must:

- Immediately invalidate the public URL.
- Delete the stored snapshot.
- Release the owner's active-link quota.
- Release the snapshot's global capacity allocation.
- Leave the local whiteboard untouched.

### Expiration

- A link expires 30 days after creation or the latest successful owner update.
- Viewing a link never renews its expiry.
- Unknown, expired, and revoked links all return the same generic `404` response.
- Expiry is enforced at read time even if the cleanup job has not run.
- A daily job permanently deletes expired records.
- An expired local whiteboard can be published again as a new share.

## Anonymous ownership

The server creates a 256-bit random owner token and stores it in a cookie with these attributes:

```text
HttpOnly
Secure
SameSite=Strict
Path=/
Max-Age=31536000
```

Only an HMAC hash of the token is stored in the database.

Ownership credentials must never appear in:

- The public URL.
- The shared snapshot.
- Browser-readable JavaScript.
- Analytics events.
- Application logs.

The local board ID identifies the source whiteboard, but it does not grant permission to manage the share.

The anonymous owner cookie provides management authorization.

Without accounts, ownership only lasts while the browser retains this cookie.

If the user clears browser data or changes browsers, they can continue viewing the public link but cannot update, reset, or delete it.

The abandoned link expires naturally after 30 days.

Secure cross-browser recovery is explicitly deferred until accounts or recovery secrets are introduced.

## Storage

Use Neon Postgres through the Vercel Marketplace.

Use the Neon serverless driver directly because this feature needs a small number of explicit queries and transactions.

Store snapshots as `jsonb` and measure their uncompressed canonical UTF-8 size before writing.

Vercel Marketplace currently supports Postgres providers including Neon and Supabase and injects connection credentials into deployments.

Reference: [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)

## Database schema

```sql
create table shared_boards (
  id uuid primary key,
  share_slug text not null unique,
  owner_hash text not null,
  source_board_id text not null,
  snapshot jsonb not null,
  snapshot_hash text not null,
  snapshot_bytes integer not null,
  schema_version integer not null default 1,
  version integer not null default 1,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  expires_at timestamptz not null,

  unique (owner_hash, source_board_id)
);

create index shared_boards_expiry_idx
  on shared_boards (expires_at);

create table share_rate_limits (
  subject_hash text not null,
  action text not null,
  bucket_start timestamptz not null,
  request_count integer not null,
  expires_at timestamptz not null,

  primary key (subject_hash, action, bucket_start)
);

create table sharing_capacity (
  singleton boolean primary key default true,
  active_records integer not null,
  active_bytes bigint not null
);
```

The `(owner_hash, source_board_id)` unique constraint guarantees one share per whiteboard even when two requests race.

## Snapshot validation

Create a dedicated sharing schema instead of accepting the existing local persistence schema directly.

Apply these initial limits:

```text
Maximum snapshot:         256 KB uncompressed
Maximum widgets:          30
Maximum notes:            100
Maximum board name:       48 characters
Maximum widget prompt:    500 characters
Maximum OpenUI source:    32 KB per widget
Maximum note body:        2,000 characters
Required widget status:   done
```

Do not allow publication while any widget is still streaming.

If a widget has failed, tell the user to finish or remove failed widgets before sharing.

The server must perform the following work before opening a database transaction:

1. Parse the payload with Zod.
2. Remove fields not required by the shared viewer.
3. Canonically serialize the snapshot.
4. Measure its actual UTF-8 byte length.
5. Calculate its content hash.
6. Reject an oversized snapshot.

The server must never trust client-provided ownership, byte counts, expiration dates, versions, or creation timestamps.

## Abuse protection

No single rate limit can identify or stop every anonymous attacker.

The system must instead cap the damage through several independent controls.

### Vercel firewall

Use the single Hobby rate-limit rule for burst protection across expensive mutation endpoints.

Start with a limit of 30 `POST`, `PUT`, or `DELETE` API requests per IP per 10 minutes.

Vercel Hobby supports fixed-window rate limiting with windows up to 10 minutes and one rule per project.

Reference: [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)

### Application limits

```text
Active links per anonymous owner:  5
New links per owner per day:       5
New links per IP per day:          15
Link resets per owner per day:     3
Updates per owner per hour:        30
Updates per IP per hour:           60
Mutation burst per owner:          5 per minute
```

Hash IP addresses with an HMAC secret before storing rate-limit counters.

Never store raw IP addresses.

All counters must use atomic database updates rather than separate read and write operations.

Expired rate-limit buckets must be deleted by the daily cleanup job.

### Turnstile

Require Cloudflare Turnstile for:

- The first publication of a whiteboard.
- Resetting a public link.
- Publishing again after the previous link expired.

Do not require Turnstile for an ordinary update to an existing active link.

Validate every Turnstile token on the server.

Turnstile tokens are single-use and expire after five minutes.

References: [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) and [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)

### Global circuit breaker

Configure conservative global limits:

```text
Soft storage ceiling:    100 MB
Hard storage ceiling:    128 MB
Maximum active records:  2,000
```

At the soft ceiling:

- Reject new links.
- Continue serving existing links.
- Allow updates that are the same size or smaller.
- Allow deletions.
- Keep the local dashboard fully operational.

At the hard ceiling:

- Reject all share creation and growth-producing updates.
- Continue serving existing links when the database permits reads.
- Continue allowing deletions when the database permits writes.
- Keep the local dashboard fully operational.

Never delete another user's unexpired share automatically to make room.

If the feature reaches capacity, stop admitting new data and show a clear temporary-capacity message.

## Publish request flow

```text
Share button
    |
    v
Client validates stable board
    |
    v
POST /api/shared-boards
    |
    +--> Validate origin and Content-Length
    |
    +--> Resolve anonymous owner cookie
    |
    +--> Validate, sanitize, size, and hash snapshot
    |
    +--> Find existing owner + board record
           |
           +--> Existing record
           |     |
           |     +--> Check update limits
           |     +--> Check expected version
           |     +--> Check capacity delta
           |     +--> Update snapshot
           |     +--> Preserve public slug
           |     +--> Renew expiry
           |
           +--> New record
                 |
                 +--> Verify Turnstile
                 +--> Check creation limits
                 +--> Check owner quota
                 +--> Check global capacity
                 +--> Create record
    |
    v
Invalidate shared-page cache
    |
    v
Return URL, version, status, and expiry
```

All quota checks, capacity changes, and snapshot writes must occur inside one database transaction.

Turnstile verification must occur before the transaction so an external network request never holds database locks.

## API design

### Publish or update

```http
POST /api/shared-boards
```

Example request:

```json
{
  "sourceBoardId": "local-board-uuid",
  "snapshot": {},
  "expectedVersion": 3,
  "turnstileToken": "required-only-for-creation"
}
```

Example response:

```json
{
  "status": "created",
  "shareId": "Fm7kP2xQ9cW4nRtB",
  "url": "https://example.com/shared/Fm7kP2xQ9cW4nRtB",
  "version": 1,
  "expiresAt": "2026-10-15T00:00:00Z"
}
```

The response status is `created`, `updated`, or `unchanged`.

### Reset

```http
POST /api/shared-boards/:shareId/reset
```

Reset requires ownership, same-origin validation, Turnstile verification, and reset quota capacity.

### Delete

```http
DELETE /api/shared-boards/:shareId
```

Delete requires ownership and same-origin validation.

### Public viewer

```text
GET /shared/:shareId
```

The public viewer returns the same `404` page for malformed, missing, expired, and revoked links.

## Concurrent updates

Maintain an integer snapshot version.

The client sends `expectedVersion` when replacing an existing snapshot.

If another tab has already published a newer version, return `409 Conflict` instead of overwriting it.

The UI must explain that another tab updated the shared link and ask the user to reload its latest status.

## Shared viewer

The public page may permit:

- Viewing widgets.
- Viewing notes.
- Panning.
- Zooming.
- Presentation mode.
- Switching light and dark themes.

It must not permit:

- Creating widgets.
- AI generation.
- Editing notes.
- Moving or resizing content.
- Deleting content.
- Retrying failed widgets.
- Accessing owner controls.

Reuse the existing `WidgetBody` renderer rather than duplicating the editable canvas implementation.

Display a small read-only banner with the exact expiration date.

## Security and privacy

- Generate public slugs with at least 128 bits of cryptographic entropy.
- Validate mutation request origins to prevent cross-site request forgery.
- Use `SameSite=Strict` and `HttpOnly` for the anonymous owner cookie.
- Add `noindex, nofollow` metadata to shared pages.
- Add `Referrer-Policy: no-referrer` to shared pages.
- Never include snapshot contents or full shared URLs in analytics.
- Disable Amplitude session replay on `/shared/*`, or mask the entire shared canvas.
- Render stored content only through the existing constrained OpenUI component library.
- Never evaluate stored JavaScript.
- Never inject raw HTML from a snapshot.
- Add a restrictive Content Security Policy.
- Never expose owner hashes, source board IDs, internal record IDs, or management information in public responses.
- Return generic messages instead of database or provider error details.

## Cache and public-read protection

Cache snapshot reads with a per-share Next.js cache tag.

Keep the page dynamic so expiration is evaluated on every request.

Cache only the database lookup result.

Invalidate the tag after update, reset, deletion, or cleanup.

Use immediate cache expiration for reset and deletion so revoked data is never served stale.

Validate the public slug format before querying the database.

Use a short database query timeout and a generic failure page.

Next.js 16 supports tag-based invalidation from Route Handlers.

Reference: [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

## Cleanup

Create a secured daily endpoint at `GET /api/cron/cleanup-shared-boards`.

The cleanup job must:

1. Verify `Authorization: Bearer ${CRON_SECRET}`.
2. Delete all expired share records.
3. Delete expired rate-limit buckets.
4. Recalculate `active_records` and `active_bytes` from stored data.
5. Log aggregate counts without logging snapshot content.
6. Return quickly if sharing is not configured.

Vercel Hobby supports one daily cron execution, although it may run at any point during the selected hour.

Reference: [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

Read-time expiry enforcement remains the security boundary.

The cron job exists only to reclaim storage and reconcile counters.

## Failure isolation

```text
Existing local canvas
    |
    +--> localStorage
    +--> existing AI endpoints
    |
    X no dependency on sharing database

Share button
    |
    +--> isolated sharing API
             |
             +--> Neon Postgres
             +--> Cloudflare Turnstile
```

Implementation rules:

- Never query the sharing database from the root layout.
- Never query sharing infrastructure while loading the editable dashboard.
- Never place sharing checks inside existing generation routes.
- Load sharing status only after the user opens the Share dialog.
- Catch every sharing failure inside the sharing hook.
- Use short timeouts for database and Turnstile requests.
- Return `503 Service Unavailable` with `Retry-After` when sharing is unavailable.
- Never put sharing errors into the main canvas state.
- Add `SHARE_WRITES_ENABLED=false` as an emergency kill switch.
- Keep public reads active when share writes are disabled.

The user-facing failure message should say:

> Sharing is temporarily unavailable.
> Your whiteboard is still saved in this browser.

## Share dialog states

The Share dialog must explicitly support:

```text
Checking
Not shared
Publishing
Shared
Updating
Unchanged
Conflict
Quota reached
Storage unavailable
Network error
Expired
```

The dialog provides these actions where appropriate:

- `Create read-only link`
- `Copy link`
- `Update shared version`
- `Reset link`
- `Delete link`

Disable repeat submission while a request is running, while still enforcing idempotency on the server.

## Planned implementation surface

Likely new files:

```text
src/lib/shared-board-schemas.ts
src/server/sharing/db.ts
src/server/sharing/security.ts
src/server/sharing/service.ts
src/server/sharing/rate-limit.ts
src/app/api/shared-boards/route.ts
src/app/api/shared-boards/[shareId]/route.ts
src/app/api/shared-boards/[shareId]/reset/route.ts
src/app/api/cron/cleanup-shared-boards/route.ts
src/app/shared/[shareId]/page.tsx
src/app/_components/whiteboard/ShareBoardButton.tsx
src/app/_components/whiteboard/ShareBoardModal.tsx
src/app/_components/whiteboard/SharedBoardCanvas.tsx
src/app/_lib/whiteboard/useBoardSharing.ts
db/migrations/001_shared_boards.sql
vercel.json
```

Likely modified files:

```text
src/app/page.tsx
src/lib/analytics.ts
package.json
README.md
```

Do not manually modify generated files or `CHANGELOG.md`.

## Error contract

The API must cover these outcomes:

```text
200  Updated or unchanged
201  Created
400  Invalid payload
403  Invalid origin or Turnstile token
404  Missing, expired, or revoked link
409  Stale snapshot version
413  Snapshot too large
429  Rate limited or owner quota reached
503  Sharing disabled or dependency unavailable
507  Global sharing capacity exhausted
```

Each error response must include a stable machine-readable code and a safe user-facing message.

## Test plan

### Unit tests

Test:

- Snapshot schema boundaries.
- Canonical serialization.
- UTF-8 byte-size enforcement.
- Public slug generation.
- Owner token hashing.
- Origin validation.
- IP hashing.
- Expiration calculations.
- Content hashing.
- Rate-limit bucket calculations.
- Capacity delta calculations.

### Database integration tests

Test:

- First publication creates one record.
- Repeated publication updates the same record.
- Concurrent first publications still produce one record.
- Identical publication avoids rewriting the snapshot.
- Another owner cannot update, reset, or delete the record.
- A stale version returns `409`.
- The sixth active link is rejected.
- Expired links do not count toward the owner quota.
- Soft capacity blocks creation but permits smaller updates.
- Hard capacity blocks growth-producing updates.
- Deletion releases owner and global capacity.
- Reset changes the public slug and invalidates the previous slug.
- Cleanup removes expired records and reconciles capacity counters.

### API tests

Exercise every documented status code and stable error code.

Mock database and Turnstile timeouts and confirm that they return bounded, safe failures.

### End-to-end tests

1. Create a whiteboard and share it.
2. Open the link in a clean browser context.
3. Confirm that the shared page is read-only.
4. Edit locally and update the same URL.
5. Confirm that another browser sees the new snapshot.
6. Reset the link and confirm that the old URL returns `404`.
7. Delete the link and confirm that the local whiteboard remains intact.
8. Reach the owner quota and confirm that the local canvas still works.
9. Simulate database failure and confirm that the local canvas still works.
10. Simulate Turnstile failure and confirm that local data remains untouched.
11. Confirm that shared content is excluded from analytics session replay.
12. Run concurrent publication from two tabs and confirm that only one link exists.

## Production failure matrix

| Failure | Sharing behavior | Main dashboard behavior |
|---|---|---|
| Neon unavailable | Share actions return recoverable `503` | Fully operational |
| Neon read-only | Reads continue where possible, writes fail | Fully operational |
| Turnstile unavailable | New shares and resets pause | Fully operational |
| Rate-limit table unavailable | Fail closed for share mutations | Fully operational |
| Cleanup fails | Read-time expiry still blocks old links | Fully operational |
| Capacity reached | New links stop, existing reads continue | Fully operational |
| Cache unavailable | Fall back to bounded database lookup | Fully operational |
| Analytics unavailable | Sharing proceeds without analytics | Fully operational |

## Rollout sequence

### Phase 1: Infrastructure

- Provision Neon through the Vercel Marketplace.
- Add and apply the database migration.
- Add environment validation.
- Deploy with `SHARE_WRITES_ENABLED=false`.

### Phase 2: Backend

- Implement the anonymous owner cookie.
- Implement validation, hashing, and storage services.
- Implement publish, update, reset, delete, and public lookup.
- Add transactional quotas and global capacity enforcement.
- Add Turnstile verification.
- Complete unit and database integration tests.

### Phase 3: Read-only viewer

- Build `/shared/[shareId]`.
- Reuse the existing widget renderer.
- Add read-only pan, zoom, notes, and presentation behavior.
- Add privacy headers and metadata.

### Phase 4: Owner UI

- Add the Share button and modal.
- Add create, update, copy, reset, delete, conflict, and failure states.
- Confirm that all errors remain isolated from canvas state.

### Phase 5: Cleanup and monitoring

- Add the secured daily cron job.
- Add capacity reconciliation.
- Add aggregate operational events.
- Alert on repeated `429`, `503`, and capacity thresholds.

### Phase 6: Controlled release

- Deploy with writes disabled.
- Verify the public viewer with a seeded database record.
- Enable writes.
- Publish one real whiteboard.
- Test the link from another browser.
- Test update, reset, deletion, and expiry behavior.
- Simulate a database outage and confirm the main dashboard remains usable.
- Monitor storage, request volume, and errors before promoting Share prominently.

## Implementation order

```text
Schema and migration
    -> security and validation helpers
    -> transactional sharing service
    -> API routes
    -> public viewer
    -> owner Share UI
    -> cleanup and monitoring
    -> end-to-end verification
```

The work should be implemented sequentially because the API, public viewer, and owner UI all depend on the same snapshot contract.

## Not in scope

- User accounts.
- Cross-device ownership recovery.
- Collaborative editing.
- Password-protected links.
- Per-recipient access control.
- Owner-facing link analytics.
- Permanent anonymous links.
- Multiple simultaneously active links for one whiteboard.
- Sharing uploaded files or external assets.

These items should be reconsidered only after the anonymous read-only sharing flow is stable in production.
