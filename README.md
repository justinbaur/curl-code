# curl-code

A full-featured HTTP client for VS Code with a clean UI and cURL backend.

> This extension is not affiliated with or endorsed by the cURL project or Daniel Stenberg.

![showcase example](media/curl-code-showcase.png)

## Features

- **Full REST Client**: Support for GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS
- **Collections**: Organize requests into collections
- **Environments**: Global and collection-scoped variables with `{{variable}}` interpolation
- **Secret Management**: Sensitive values stored securely via VS Code's encrypted storage
- **History**: Track all your requests automatically
- **.http File Support**: Supports .http/.rest files with syntax highlighting
- **.env File Support**: Import `.env` files as environments with automatic reload on change
- **Authentication**: Basic Auth, Bearer Token, API Key, Digest, NTLM, Negotiate, AWS Sigv4, and OAuth2
- **Advanced cURL Flags**: 35+ options — Cookies, HTTP version, proxy, SSL/TLS, retries, and more
- **Response Viewer**: Body, Headers, cURL command, and verbose Log tabs with syntax highlighting
- **Resizable Layout**: Drag to resize request/response panels with horizontal or vertical orientation
- **Copy as cURL**: Export any request as a cURL command

## Settings

- `curl-code.curlPath`: Path to cURL executable (default: `curl`)
- `curl-code.timeout`: Request timeout in milliseconds (default: 30000)
- `curl-code.followRedirects`: Follow HTTP redirects (default: true)
- `curl-code.verifySSL`: Verify SSL certificates (default: true)
- `curl-code.saveRequestHistory`: Save request history (default: true)
- `curl-code.maxHistoryItems`: Maximum history items (default: 50)

## Requirements

- cURL must be installed on your system
- Most systems have cURL pre-installed
- Download from: https://curl.se/download.html

## Quick Start

1. Click the curl-code icon in the Activity Bar
2. Click "New Request"
3. Enter a URL and click "Send" or press `Enter`

## Resizable Layout

The request and response panels are separated by a draggable handle. Drag it to adjust how much space each panel gets (clamped between 20–80%).

### Orientation Toggle

Click the orientation button in the top bar to switch between:

- **Horizontal (stacked)**: Request on top, response below
- **Vertical (side-by-side)**: Request on left, response on right

![side-by-side layout](media/curl-code-orientation.png)

## Response Viewer

Responses are displayed in a tabbed viewer with metadata at the top showing the HTTP status code (color-coded), response time, and body size.

### Tabs

- **Body**: Syntax-highlighted response body with JSON formatting
- **Headers**: All response headers in key-value format
- **cURL**: The exact cURL command that was executed — ready to copy and reproduce
- **Log**: Verbose debug output (see [Verbose Logging](#verbose-logging) below)

## Advanced cURL Flags

The **Advanced** tab in the request builder exposes fine-grained control over cURL behavior, organized into 12 categories:

| Category | Options |
|----------|---------|
| **HTTP Version** | HTTP/1.0, HTTP/1.1, HTTP/2, HTTP/2 Prior Knowledge, HTTP/3, HTTP/3 Only |
| **Connection** | Connect timeout, keepalive time, disable keepalive, TCP no delay |
| **Cookies** | Cookie string/file, cookie jar file |
| **Proxy** | Proxy URL, proxy auth, no-proxy list |
| **SSL/TLS** | TLS version (1.0–1.3), CA cert, client cert, client key |
| **Redirects** | Max redirects, send auth on redirect, keep POST on 301/302/303 |
| **Retry** | Retry count, retry delay, retry max time |
| **Debug & Compression** | Auto-decompress, verbose output |
| **Auth Extensions** | Digest, NTLM, Negotiate/SPNEGO, AWS Sigv4, OAuth2 Bearer |
| **DNS/Resolution** | Custom resolve (host:port:addr), connect-to mapping |
| **Rate Limiting** | Limit rate (e.g. 100K), max filesize |
| **Other** | User-Agent, Referer |

![advanced cURL flags](media/curl-code-flags.png)

### Custom Flags

A raw flags textarea is always available at the bottom of the Advanced tab. Enter any additional cURL arguments directly — quoted strings are supported.

## Verbose Logging

Enable the **Verbose** toggle in the Advanced tab (Debug & Compression section) to capture cURL's full debug output. The **Log** tab in the response viewer displays it with color-coded lines:

- `*` lines — connection info, TLS handshake, DNS resolution
- `>` lines — request data sent to the server
- `<` lines — response data received from the server

A badge dot appears on the Log tab when debug output is available.

![verbose log output](media/curl-code-debug.png)

## Using .http Files

Create a file with `.http` or `.rest` extension:

```http
### Get Users
GET https://api.example.com/users
Authorization: Bearer {{token}}

### Create User
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

Click the "Send Request" CodeLens above each request to execute it.

## Collections

Collections let you organize and save requests for reuse.

### Creating Collections

1. Open the curl-code sidebar
2. Click the folder **+** icon in the Collections section
3. Give your collection a name

### Saving Requests

- Click **Save** or **Save As** in the request panel

### Linked Collections

Collections can be linked to a `.json` file in your workspace. Changes to the file are reflected in the collection and vice versa. This is useful for sharing collections with your team via source control.

### Import / Export

- **Export**: Right-click a collection and select **Export Collection** to save it as a JSON file
- **Import**: Click the import icon in the Collections section to load a JSON collection file

> Exported collections never contain secret values — they are automatically redacted during export.

## Environments

Environments let you define variables that are substituted into your requests at send time. Use the `{{variableName}}` syntax anywhere in a URL, header value, request body, or authentication field.

### Global Environment

The global environment applies to all requests regardless of which collection they belong to. Manage it from the **Environments** section in the sidebar.

### Collection Environments

Each collection can have its own environments. This is useful for switching between configurations (e.g., `dev`, `staging`, `production`) without editing individual requests.

1. A new collection will be given an empty environment
2. Navigate to it in the **Environments** section
3. Create an environment and add variables

### .env File Import

Import standard `.env` files as environments:

1. Click the file import icon in the **Environments** section
2. Select a `.env` file from your workspace
3. Variables are loaded and a file watcher is set up for automatic reload

Imported `.env` environments are **read-only** in the sidebar — edit the file directly to make changes. Use the context menu to open, reload, or remove the linked file.

### Quick Switch

Click the environment name in the VS Code status bar to quickly switch the active environment. The status bar shows a globe icon for regular environments and a file icon for `.env` file environments.

## Secrets

Environment variables can be marked as **Secret** to protect sensitive values like API keys, tokens, and passwords.

### Creating a Secret Variable

1. Add a new variable to any environment (global or collection)
2. When prompted, select **Secret** as the variable type
3. Enter the value — input is masked as you type

### How Secrets Are Stored

- Secret values are stored in **VS Code's SecretStorage**, which uses your operating system's credential manager (Keychain on macOS, DPAPI on Windows, libsecret on Linux)
- Secrets are **never written to disk in plaintext** — collection JSON files contain only redacted placeholders
- Secrets are **automatically redacted** when exporting a collection
- In the sidebar, secret values are displayed as `••••••`

#### Why This Matters

If you keep your collections in source control (e.g., linked collections in a `.json` file), your secret values will not leak into your repository. Only the variable names and non-secret values are persisted to disk.

## Authentication

The request editor supports built-in authentication methods:

- **None**: No authentication
- **Basic Auth**: Username and password (sent as Base64-encoded `Authorization` header)
- **Bearer Token**: Token value sent as `Authorization: Bearer <token>`
- **API Key**: Key-value pair sent as either a header or a query parameter

Additional authentication methods are available in the [Advanced cURL Flags](#advanced-curl-flags) under **Auth Extensions**: Digest, NTLM, Negotiate/SPNEGO, AWS Sigv4, and OAuth2 Bearer.

Authentication fields support `{{variable}}` interpolation, so you can store credentials in your environment.
