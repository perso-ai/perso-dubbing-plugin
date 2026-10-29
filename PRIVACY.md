# Perso Dubbing plugin data handling

## Scope and source of this notice

This submission-branch notice incorporates operator confirmations supplied on October 29, 2026. It supplements the Perso Privacy Policy effective June 26, 2026 and Terms of Use effective October 22, 2026; it does not replace or amend them. The operator confirms that the product's common terms and retention/deletion rules also apply to API use.

Client behavior below refers to the submission source version 0.8.16-claude.5. Service-operation statements identified as operator confirmations come from the operator's responses supplied for this review. They are not an independent inspection of cloud settings. Items not yet established are listed separately in [open operational items](REVIEW.md#open-operational-items).

## 1. Requested operations and data

Dubbing, lip-sync, transcription and audio separation send selected media or source URLs to Perso services. Media may contain faces, voices or other personal information. Results and project metadata may be stored in the Perso workspace; local outputs and resume files may remain in the selected output directory. Use content and voices you have permission to process.

Authenticated API requests use the configured Perso HTTPS API origin, by default https://api.perso.ai. The client checks the destination before attaching the API key and checks redirects before following them. Storage uploads and downloads can use URLs returned by the API. Requested service processing is separate from usage analytics.

## 2. Voice cloning, lip-sync and generation processing

The operator clarified that the input processing described as "learning" in voice cloning and lip-sync means individual processing to generate the requested result. It is not a statement that those inputs are reused to retrain a shared model. The operator reports that inputs are not used for that described learning outside voice cloning and lip-sync.

The operator reports that refusing this required processing prevents service use, with no exception and no separate rules by content category. The precise scope of the service restriction is recorded in the [open operational items](REVIEW.md#open-operational-items). This notice does not present a processing-free option for the same requested generation.

Privacy Policy Article 1 and Terms Article 4 contain broader permission for learning or improvement uses. The Terms also provide a right to refuse learning consent, with possible restrictions on certain services. The operator's description of current generation processing does not amend those published clauses or establish a blanket no-training guarantee for every provider.

Terms Article 5 limits biometric use to essential service provision and specifies encrypted, separate storage, prompt destruction after the service purpose is fulfilled, and a destruction-request right. Article 29(5) restricts access to private user-generated content, subject to legal exceptions. These are published service commitments; they do not describe encryption of the local API-key file.

## 3. Local credentials and state

On Claude versions supporting userConfig, the optional masked Perso API key setting copies the user-provided value into ~/.perso/credentials at session start, without printing it. This is the same local storage used by browser sign-in and creates an additional copy outside Claude's secure configuration store. Leaving the option empty does not overwrite an existing key.

An explicit XP_API_KEY environment override takes precedence over the saved key. Otherwise the worker reads ~/.perso/credentials. Windows uses Windows DPAPI for the credential file. On macOS/Linux, the key is plaintext and the file is created with mode 0600. File permissions are not encryption. Never paste a key into chat.

Local state can also include installation/account identifiers, workspace and plan information, acquisition records and update-check state. Uninstalling the plugin does not guarantee removal of this state or downloaded outputs.

## 4. Analytics and attribution

Analytics are enabled by default. Events are sent to Amplitude at https://api2.amplitude.com/2/httpapi and acquisition user properties to /identify. Supported overrides are the corresponding EU Amplitude endpoint or an explicitly configured loopback test collector. Analytics requests do not follow redirects. The fixed publisher-owned Amplitude ingestion key is public and separate from the Perso API credential; this submission build does not read a user-supplied Amplitude key.

Event fields can include a random installation ID, account userSeq when resolved, workspace ID, plan, application/agent version, OS, locale-derived language/country, operation type, media duration, selected options, outcome and error category. These identifiers can link activity and are not described as anonymous. The telemetry implementation is intended to exclude Perso API keys, media content, filenames, subtitle text and email addresses. Requested Perso service operations may still process such data.

Runtime names supplied with --host are restricted to known agent labels. Error-code telemetry accepts short Perso code formats, HTTP statuses and known local error tokens; other values are omitted before transmission. This filtering applies to analytics and preserves the original processing and retry errors.

The session-start installation hook can send an event once per installation/version and start a temporary loopback receiver at 127.0.0.1:41599. It accepts acquisition data from HTTPS perso.ai origins, including GA client/session IDs, campaign fields, referring host and installation method, and can send them to Amplitude. The normal background receiver window is five minutes. These actions may occur before a media job starts.

## 5. Infrastructure, other connections and controls

The operator describes an Azure-based cloud environment operated on a Korean basis with cloud encryption in use. This is an operator statement about the service environment, not a guarantee that every provider, transfer, backup or administrative access is confined to Korea.

Privacy Policy Article 6 names Azure storage/IT operations and Amplitude analytics, among other providers. Article 7 lists US transfers involving Google, ESTsoft, Stripe and Microsoft. Transfer-refusal requests can be sent to privacy@estsoft.com, with possible loss of the relevant service access.

Browser sign-in uses https://developers.perso.ai by default. The separate version check contacts https://registry.npmjs.org/perso-dubbing/latest. Some media operations require ffmpeg/ffprobe; missing dependencies may be installed through an available system package manager using its configured sources.

Set PERSO_NO_TELEMETRY=1 in the environment inherited by the host and its hooks before launching the host to disable plugin analytics and attribution receiving, reading and sending. This does not erase past data, disable website analytics or stop API traffic required for a requested job. It is not a control for refusing generation processing. Set PERSO_NO_UPDATE_CHECK=1 to disable the separate npm version check.

## 6. Common product and API retention rules

The operator confirms that product retention and deletion rules apply equally to API use. Privacy Policy Articles 2 and 5 state the following category-specific periods: membership information, one month after withdrawal; internal dispute records, one month after processing ends, subject to statutory retention; contracts/payments, tax and electronic financial transaction records, five years; consumer disputes, three years; advertising records, six months; access records, three months.

Terms Article 26(4) specifies immediate deletion on agreement termination, subject to legal and Privacy Policy retention exceptions. Article 29(8) specifies deletion of created/uploaded content when a member has not used the Service for over one year. The latter is an inactivity trigger, not a one-year maximum for all data. Subscription cancellation alone is not necessarily agreement termination. The Privacy Policy does not set a fixed duration for media during ordinary active use.

Privacy Policy Article 4 separately describes website behavioral-data retention until consent withdrawal or membership termination. The three-month access-record period is not automatically a period for every API log. Terms Article 35 provides a 45-day rights-request response period, extendable by 45 days, in its US/California provisions; this is not a global deadline for erasing backups.

## 7. Requests and local cleanup

Privacy Policy Articles 5 and 9 provide for destruction of unnecessary data, segregation of legally retained records, and access, correction, deletion and suspension requests. Withdrawal is requested through Account Settings > Membership Withdrawal. Contact support@perso.ai for service requests and privacy@estsoft.com for privacy inquiries. Identity verification and legal exceptions apply.

Disabling analytics is not a deletion request. Removing a local credential file does not revoke the API key or delete remote projects. Clearing the optional Claude setting alone does not delete its local copy. To stop local credential reuse, stop active plugin processes, clear that setting and any configured XP_API_KEY override, and remove the selected local credential file. Request key revocation separately through the service or support.

Review local ~/.perso state and selected output/resume files before removing them. Other Perso installations may share that state, and outputs may be stored elsewhere. Uninstalling the plugin or withdrawing the service account is not a verified procedure for cleaning up all local files.

## Published sources

- [Perso Privacy Policy](https://info.perso.ai/policy-perso-saas/policy/privacy-policy-en/docs/260619.html), effective June 26, 2026.
- [Perso Terms of Use](https://info.perso.ai/policy-perso-saas/policy/terms-of-service-en/docs/261015.html), effective October 22, 2026.
