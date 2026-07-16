# Wormholes Beta 301 served-build security headers

Wormholes includes a restrictive Content Security Policy in the HTML so the same baseline is enforced when the app is opened directly or served from a static host.

For a served build, configure the web server to send this response header as well. The header form adds `frame-ancestors 'none'`, which browsers do not enforce from an HTML `<meta>` policy.

```http
Content-Security-Policy: default-src 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; script-src 'self'; script-src-elem 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'none'; media-src 'none'; connect-src blob:; manifest-src 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()
```

The included `_headers` file applies these values on static hosts that support that format. On another host, copy the same values into its response-header configuration.

## Intentional allowances

- Scripts and stylesheet files may load only from the Wormholes build itself.
- Inline event-handler scripts are blocked.
- Dynamic inline style attributes remain allowed because the maps and dialogs use them for geometry and positioning; inline `<style>` blocks remain restricted to same-origin stylesheet files in modern browsers.
- Images may load only from the build, embedded image data, or temporary browser blob URLs.
- Network connections are denied except reads from temporary blob URLs used during local image/document processing.
- Frames, plug-ins, workers, web fonts, media streams, manifests, forms, and base-URL changes are blocked.


For the supported security boundary, data assumptions, and limitations, see `SECURITY_AND_TRUST.md`. For the detailed threat register and control-to-test matrix, see `THREAT_MODEL.md`.
