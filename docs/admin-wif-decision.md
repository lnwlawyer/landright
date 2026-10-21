# LandRight WIF decision — Cloudflare Workers Free

**Decision: Do not activate Google WIF in the production Worker until an attested, workload-specific OIDC assertion is available to the Worker at request time.**

The repository has a Google STS exchange primitive (`admin/google-wif-token.mjs`), but it deliberately requires an external `getSubjectToken` callback. It does not create or sign identities. Merely creating a Google WIF pool/provider would not supply that callback.

The current production Worker has no verified ambient OIDC identity issuer bound to this particular Worker. GitHub Actions OIDC only identifies the CI job and must never be forwarded to the runtime as a long-lived credential. Cloudflare Access JWTs authenticate incoming clients; they do not by themselves establish the server-side workload's identity. Arbitrary headers or a self-signed token are not acceptable substitutes.

## Available paths
- **Keyless WIF:** Use only after confirming an OIDC issuer that issues short-lived tokens uniquely bound to this Cloudflare Worker, with Google-trusted JWKS, claim restrictions, and an audited token retrieval method on Workers Free. Then wire the provider into the existing Google REST reader and test negative cases.
- **Keyless Google-hosted backend:** Move the privileged Google REST calls to a Google-managed identity runtime, subject to explicit cost/billing review and user approval; this changes architecture.
- **Existing Worker service account JSON:** Technically supported but introduces a long-lived private key; not selected while the user prefers WIF.

## Security and operations
- No keys generated or copied, no WIF pool configured without a trusted issuer.
- Keep `landright-admin-api` fail-closed with HTTP 503 until credentials are configured and authorization tests pass.
- Existing `firebase-mcp` and `firebase-readonly-mcp` are unchanged.
- Cloudflare Workers Free does not automatically imply Google Cloud API usage is free. Do not enable billing or paid services without approval.

References:
https://docs.cloud.google.com/iam/docs/workload-identity-federation
https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation
https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers
