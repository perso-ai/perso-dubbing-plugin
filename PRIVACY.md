# Plugin data handling

This technical notice describes the Claude directory submission branch. It supplements, and does not replace, the [Perso service privacy policy](https://info.perso.ai/policy-perso-saas/policy/privacy-policy-en/docs/260619.html) (effective June 26, 2026) and [Terms of Use](https://info.perso.ai/policy-perso-saas/policy/terms-of-service-en/docs/261015.html) (effective October 22, 2026). Published commitments below are distinguished from verified client behavior and unconfirmed service implementation.

Reviewed on October 29, 2026. Technical behavior below is based on the submission branch; unconfirmed service operations are explicitly identified.

## Requested service operations

Dubbing, lip-sync, transcription and audio separation send selected media or source URLs to Perso services. Media may contain faces, voices or other personal information. Results and project metadata may be stored in the Perso workspace; local outputs and resume files may remain in the selected output directory. Use content you have permission to process.

Authenticated API requests use the configured Perso HTTPS API origin (default `https://api.perso.ai`). The client checks the destination before attaching the key and checks redirects before following them. Storage uploads and downloads can use URLs returned by the API. This is separate from usage analytics.

Privacy Policy Article 1 and Terms Article 4 permit learning or improvement uses. The Terms also provide a right to refuse learning consent, with possible service restrictions. The plugin-specific implementation, refusal route and effect on previously processed data remain unconfirmed; no exclusion from training is promised here.

Terms Article 5 limits biometric use to essential service provision and specifies encrypted, separate storage and prompt purpose-based destruction, with a destruction-request right. Article 29(5) limits access to private user-generated content, subject to legal exceptions. How these commitments interact with learning, API processing and support access requires operator clarification. These server commitments do not describe encryption of the local API-key file.

## Local credentials and state

On Claude versions supporting `userConfig`, the optional masked **Perso API key** setting explicitly copies the user-provided value into `~/.perso/credentials` at session start, without printing it. This uses the same local storage as browser sign-in; it is an additional copy outside Claude's secure configuration store. Leaving the option empty does not overwrite an existing key. To remove it, clear the option and delete the local credential file; to revoke the key, use the Perso service.

An explicit `XP_API_KEY` environment override takes precedence over the saved key. Otherwise the worker reads `~/.perso/credentials`. On Windows, the credential file uses Windows DPAPI. On macOS/Linux, the key is plaintext and the file is created with mode `0600`; file permissions are not encryption. Never paste a key into chat. Local state can also include installation/account identifiers, workspace and plan information, acquisition records and update-check state. Uninstalling the plugin does not guarantee removal of this state or downloaded outputs.

## Usage analytics and attribution

Analytics are on by default. The code sends events to Amplitude at `https://api2.amplitude.com/2/httpapi`, and acquisition user properties to `/identify`. Supported overrides are the corresponding EU Amplitude endpoint or an explicitly configured loopback test collector. Redirects are not followed for analytics requests. The Amplitude project key is a fixed publisher-owned public ingestion key, separate from the Perso API credential. This submission build does not read a user-supplied Amplitude key from the machine.

Event fields can include a random installation ID, account `userSeq` when resolved, workspace ID, plan, application/agent version, OS, locale-derived language/country, operation type, media duration, selected options, outcome and error category. These identifiers can link activity and must not be described as anonymous. The telemetry implementation is intended to exclude Perso API keys, media content, filenames, subtitle text and email addresses from analytics; this does not mean the requested Perso service operation never processes such data.

Runtime names supplied with `--host` are restricted to known agent labels. Error-code telemetry accepts short Perso code formats, HTTP statuses and known local error tokens; other values are omitted before transmission. This filtering affects analytics only and preserves the original errors used by processing and retry logic.

The session-start installation hook can send an event once per installation/version and start a temporary loopback receiver at `127.0.0.1:41599`. It accepts acquisition data from HTTPS `perso.ai` origins, including GA client/session IDs, campaign fields, referring host and installation method, and can send these to Amplitude. The normal background receiver window is five minutes. These actions may happen before a media job starts.

## Other connections and controls

Browser sign-in uses `https://developers.perso.ai` by default. The separate version check contacts `https://registry.npmjs.org/perso-dubbing/latest`. Some media operations require ffmpeg/ffprobe, and missing dependencies can be installed through an available system package manager. Those downloads use the package manager's configured sources. No complete server-side processor inventory or processing-location guarantee is established by the client code.

Privacy Policy Article 6 names Azure storage/IT operations and Amplitude analytics, among other providers. Article 7 lists US transfers for Google, ESTsoft, Stripe and Microsoft, but does not map every plugin flow or establish Azure/Amplitude storage regions. It provides a transfer-refusal contact at `privacy@estsoft.com`, with possible loss of relevant service access. Actual plugin processing and backup locations still require confirmation.

Set `PERSO_NO_TELEMETRY=1` in the environment inherited by the host and its hooks before launching the host to disable plugin analytics and attribution receiving, reading and sending. This does not erase past data, disable website analytics or stop service API traffic required for a requested job. Set `PERSO_NO_UPDATE_CHECK=1` to disable the separate npm version check.

## Retention and deletion

The service policy (effective June 26, 2026), Articles 2 and 5, states:

- Membership information: one month after withdrawal. Internal dispute records: one month after processing ends, subject to statutory retention.
- Statutory records: contracts/payments, tax and electronic financial transactions, five years; consumer disputes, three years; advertising, six months; access records, three months.
- Media/content: the Privacy Policy gives no fixed duration for ordinary active use. Separate Terms provisions below specify deletion events.

Terms Article 26(4) specifies immediate deletion on agreement termination, subject to legal and Privacy Policy retention exceptions. Article 29(8) specifies deletion of created/uploaded content when a member has not used the Service for over one year. This is an inactivity trigger, not a one-year maximum for all data. Subscription cancellation alone is not necessarily agreement termination.

Privacy Policy Article 4 separately describes website behavioral-data retention until consent withdrawal or membership termination. Its applicability to plugin telemetry is unconfirmed. Terms Article 35 describes a 45-day rights-request response period, extendable by 45 days, in its US/California provisions; it is not a global backup-erasure deadline.

These published rules are not verified operational schedules for every plugin data flow. Analytics, attribution, API logs, project metadata and backups still need category-level mapping, including how termination, inactivity and biometric-purpose triggers are implemented. The three-month access-record rule must not be applied automatically to every API log.

Privacy Policy Articles 5 and 9 provide for destruction of unnecessary data, segregation of legally retained records, and access, correction, deletion and suspension requests. Withdrawal is requested through Account Settings > Membership Withdrawal. Contact `support@perso.ai`; privacy inquiries go to `privacy@estsoft.com`. Identity verification and legal exceptions apply.

Disabling analytics is not a deletion request. Removing a local credential file does not revoke the API key or delete remote projects. Clearing the optional Claude setting alone does not delete its local copy. To stop local credential reuse, stop active plugin processes, clear that setting and any configured `XP_API_KEY` override, and remove the selected local credential file. Request key revocation separately through the service or support.

Review local `~/.perso` state and chosen output/resume files separately before removing them: other Perso installations can share this state, and outputs may be outside `~/.perso`. Uninstalling the plugin or withdrawing the service account is not a verified local-cleanup procedure. Remote deletion coverage for backups, shared workspaces and processors still requires confirmation from the service operator.
