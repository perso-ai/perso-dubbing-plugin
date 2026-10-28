# Plugin data handling

This technical notice describes the Claude directory submission branch. It supplements, and does not replace, the [Perso service privacy policy](https://info.perso.ai/policy-perso-saas/policy/privacy-policy-en/docs/260619.html).

## Requested service operations

Dubbing, lip-sync, transcription and audio separation send selected media or source URLs to Perso services. Media may contain faces, voices or other personal information. Results and project metadata may be stored in the Perso workspace; local outputs and resume files may remain in the selected output directory. Use content you have permission to process.

Authenticated API requests use the configured Perso HTTPS API origin (default `https://api.perso.ai`). The client checks the destination before attaching the key and checks redirects before following them. Storage uploads and downloads can use URLs returned by the API. This is separate from usage analytics.

## Local credentials and state

The worker resolves a Perso API key from `XP_API_KEY` or `~/.perso/credentials`. On Windows, the credential file uses Windows DPAPI. On macOS/Linux, the key is plaintext and the file is created with mode `0600`; file permissions are not encryption. Never paste a key into chat. Local state can also include installation/account identifiers, workspace and plan information, acquisition records and update-check state. Uninstalling the plugin does not guarantee removal of this state or downloaded outputs.

## Usage analytics and attribution

Analytics are on by default. The code sends events to Amplitude at `https://api2.amplitude.com/2/httpapi`, and acquisition user properties to `/identify`. Supported overrides are the corresponding EU Amplitude endpoint or an explicitly configured loopback test collector. Redirects are not followed for analytics requests. The Amplitude project key is separate from the Perso API credential.

Event fields can include a random installation ID, account `userSeq` when resolved, workspace ID, plan, application/agent version, OS, locale-derived language/country, operation type, media duration, selected options, outcome and error category. These identifiers can link activity and must not be described as anonymous. The telemetry implementation is intended to exclude Perso API keys, media content, filenames, subtitle text and email addresses from analytics; this does not mean the requested Perso service operation never processes such data.

The session-start installation hook can send an event once per installation/version and start a temporary loopback receiver at `127.0.0.1:41599`. It accepts acquisition data from HTTPS `perso.ai` origins, including GA client/session IDs, campaign fields, referring host and installation method, and can send these to Amplitude. The normal background receiver window is five minutes. These actions may happen before a media job starts.

## Controls and retention

Set `PERSO_NO_TELEMETRY=1` in the environment inherited by the host and its hooks before launching the host to disable plugin analytics and attribution receiving, reading and sending. This does not erase past data, disable website analytics or stop service API traffic required for a requested job. Set `PERSO_NO_UPDATE_CHECK=1` to disable the separate npm version check.

Consult the service privacy policy for retention and data-rights procedures. A fixed retention duration for plugin analytics, attribution, API logs and project backups has not been confirmed for this notice. No automatic deletion deadline is promised here. Disabling analytics is not a deletion request; deleting a local key file does not revoke the API key or delete remote projects. Contact `support@perso.ai` for service requests or `privacy@estsoft.com` for privacy inquiries.
