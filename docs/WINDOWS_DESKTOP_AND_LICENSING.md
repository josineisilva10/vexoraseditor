# VEXORA SAMPLER — Windows release and licensing plan

This document is the implementation checklist for turning the current React/TypeScript sampler into a Windows desktop product. The current web app must remain usable while the desktop work is developed on the `windows-desktop-foundation` branch.

## Product rules agreed with the owner

- Target platform for the first release: Windows only.
- Beta/demo: five minutes per launch/session; no project/configuration saving or export while in demo mode.
- Full version: lifetime license, activated with a key and buyer email.
- One active Windows device binding per license.
- After first successful activation, normal sampler use should be possible offline by verifying a signed license token locally.
- Formatting or replacing the PC can remove the local device identity; reactivation is handled by the owner after contacting support.
- The owner needs a private license manager to issue keys, see activation status, block a key, release a device binding, and approve reactivation/transfers.
- Existing sampler UI, audio banks, imported sounds, wallpaper, and controls must be preserved.

## Security requirements

- The client must never contain a Supabase service-role key or any license-signing private key.
- Raw license keys must not be stored in the database. Store a cryptographic hash and show the generated key to the owner only once.
- Device identifiers must not be stored in raw form. Send/store a one-way hash of a product-specific device identifier.
- License issuance, activation, reactivation, and blocking must run in server-side functions using privileged credentials.
- A valid activation should receive a signed license payload. The desktop app will verify it with an embedded public key; the private signing key stays on the server.
- Because an offline license cannot receive instant revocation, blocking takes effect the next time the app checks in. This tradeoff must be clear to the owner.
- The five-minute demo and no-save rule are product controls, not an absolute anti-piracy guarantee.

## Implementation sequence

### 1. Desktop packaging discovery
- Confirm the production build output and whether the current TanStack Start/Nitro configuration can produce a static frontend.
- Choose and configure the Windows desktop shell only after confirming the build mode. Tauri is preferred if the app can be served as a static frontend; if the existing SSR server is required, evaluate packaging a local server rather than breaking the current app.
- Add Windows installer, app metadata/icon, and CI build validation.
- Test the installer on a clean Windows account before calling it release-ready.

### 2. License database and server API
- Apply `202610120001_vexora_license_foundation.sql` to the Supabase project only after reviewing the target project and environment.
- Implement server-side functions for owner-only key issuance, activation, status checks, blocking, and owner-approved reactivation.
- Add admin authentication and audit logs before exposing a management panel.
- Do not use browser-only checks or client-side secrets as the licensing authority.

### 3. Desktop identity and activation
- Generate a product-specific installation identity and combine it with a stable Windows device identifier where available.
- Hash the identifier before sending it to the server.
- On first activation, bind the license to one device and cache a signed license token locally.
- Verify the token offline on subsequent launches; re-check online when available and follow a defined support/recovery flow after formatting.

### 4. Beta and full-version gates
- Add a clear five-minute demo timer.
- In demo mode, disable save/export actions and prevent writes that would persist user-created projects/settings/audio mappings.
- On expiry, stop demo playback and show the activation screen.
- In full mode, unlock features only after a valid signed license is verified.
- Test timer reset, app restart, clock changes, offline behavior, and attempts to bypass UI-only restrictions.

### 5. Owner license manager and release
- Private admin panel protected by authentication and server-side authorization.
- Generate lifetime keys, associate buyer email, view activation, block/revoke, and release a device only with owner approval.
- Build, sign if available, and test the Windows installer; provide a simple Portuguese installation/activation guide.

## Current status

- [x] Isolated work on a separate branch to avoid destabilizing the connected Lovable/main branch.
- [x] Added the first database schema for licenses and one-active-device bindings, with direct browser access revoked.
- [ ] Apply migration to the intended Supabase project.
- [ ] Build server-side licensing functions and owner authentication.
- [ ] Configure and validate the Windows desktop packaging path.
- [ ] Implement device binding, signed offline license, and support reactivation.
- [ ] Implement five-minute demo and save/export restrictions.
- [ ] Test a Windows installer on a clean machine.

No customer-facing license activation is functional yet; the schema is groundwork only.
