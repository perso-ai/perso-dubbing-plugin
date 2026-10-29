# Perso Dubbing directory review notes

Prepared October 29, 2026 for the `claude-directory-submission` branch, version `0.8.16-claude.5`. These notes describe review evidence and its limits. They do not claim Anthropic approval or replace the service Terms or Privacy Policy.

## Scope of this update

This update incorporates operator-confirmed product/API rules and individual generation processing into [PRIVACY.md](PRIVACY.md) and the README. It aligns the marketplace publisher label with the existing plugin author, Perso AI (ESTsoft). It also moves the marketplace description into the supported metadata field; the plugin description remains. It changes documentation and version/publisher metadata only. Runtime scripts, authentication options and media features are unchanged.

## Credential data flow

The recorded directory finding connects environment access in [telemetry.mjs](skills/dubbing/lib/telemetry.mjs) with a media destination in [project_media.mjs](skills/clip/lib/project_media.mjs). These files participate in different request paths:

| Request path | Credential handling | Destination control |
| --- | --- | --- |
| Analytics | A fixed publisher-owned public Amplitude ingestion key; not the user's Perso API key. Installation IDs are validated as UUIDs. Credential-file presence is reduced to a boolean without reading or decrypting the key. | [telemetry_endpoint.mjs](skills/dubbing/lib/telemetry_endpoint.mjs) validates supported analytics endpoints; analytics requests do not follow redirects. |
| Authenticated Perso API | The user's configured Perso credential is attached by [http_client.mjs](skills/dubbing/lib/http_client.mjs). Existing browser sign-in, local credentials and the explicit environment override remain supported. | The client checks the configured HTTPS API origin before attaching the key and follows authenticated redirects only on that origin. |
| Project media and timestamps | The media helper calls `fetch` without adding the Perso credential header or a request body. API calls that obtain download metadata use the authenticated API client separately. | Project URLs can come from the Perso API/storage flow; downloads follow the fetch implementation's redirect behavior. This is not a claim that every media destination has been independently audited. |

The optional sensitive Claude `userConfig` setting explicitly copies a user-provided key into local credential storage at session start. The extra local copy, platform-specific protection, environment precedence and removal procedure are disclosed in [PRIVACY.md](PRIVACY.md). Actual Claude host injection remains unverified. We have not removed supported authentication flows or hidden environment reads to change a scanner result.

Existing local tests intercept requests and use synthetic values. The data-flow scenario checks that these values do not appear in captured analytics or media-download requests, while the intended Perso API request carries its configured credential. It also checks telemetry opt-out and filtering of unsupported runtime/error values. These tests do not establish live service behavior, Windows runtime behavior, or directory clearance. Local test results are supplied in the separate review packet.

## Publisher provenance

- Product publisher: Perso AI (ESTsoft); repository owner: [`perso-ai`](https://github.com/perso-ai).
- The [official product agent page](https://perso.ai/dubbing/agents) links to this repository.
- The GitHub organization profile links to [perso.ai](https://perso.ai/).
- Plugin and marketplace author metadata identify Perso AI (ESTsoft).

The recorded similarity finding compares the GitHub owner `perso-ai` with `verso`. The actual repository owner is unchanged. The links above are publisher provenance evidence, not a claim of GitHub verified-organization status or permission to use another publisher's identity.

## Open operational items

Operator confirmation has established common product/API terms and retention/deletion rules, the individual generation meaning of voice cloning/lip-sync learning, an Azure-based Korean-operated cloud environment with cloud encryption, and a mandatory age-confirmation checkbox. The following narrower points remain open:

1. Exact periods and triggers for API logs, analytics, attribution and backups; current cleanup deployment/recovery settings; final deletion of shared, orphaned, engine and backup data. The single portal retention category is not yet selected.
2. Whether refusing required generation processing restricts the requested features or the whole service, and provider-specific subsequent processing/retention and treatment of previously processed data. The meaning of the operator's term "learning" has already been clarified.
3. Actual provider/country mapping for external engines, analytics, logs, backups and overseas administrative access, and the specific scope of biometric separation/encryption. Korean-based operations do not establish that every flow stays in Korea.
4. The numeric minimum age and whether the plugin is intended for people under 18. The checkbox format alone does not answer these questions; an example from another service is not Perso's age policy.
5. Authorized reviewer access or an invitation to an isolated workspace, approved credit/model limits, expiry/revocation responsibility, and a short speech/video sample cleared for external review and API processing. An existing silent local fixture tests clip/subtitle operations only.
6. Actual Claude host configuration injection, Windows DPAPI execution, authenticated dubbing/transcription/lip-sync workflows, and the supported scope in Claude chat/Cowork. Local mock tests do not establish these results.
7. How the common Terms Article 30 applies to official API downloads and plugin clip/subtitle editing of service outputs. Common terms apply, but no API-specific exception or definitive interpretation has been supplied.

## Anthropic review

The recorded source validation before this documentation update passed with two policy holds: credential use and publisher similarity. A validation result applies only to its scanned commit. This update must be revalidated before any later submission.

Written guidance on Software Directory Policy 4.B eligibility for AI dubbing and optional lip-sync remains pending in the available correspondence. Operator confirmations, local tests and public provenance do not resolve Anthropic's policy decision. The listing has not been submitted.
