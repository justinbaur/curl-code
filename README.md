# curl-code

A full-featured HTTP client for VS Code with a clean UI and cURL backend.

> This extension is not affiliated with or endorsed by the cURL project or Daniel Stenberg.

## Features

- 🚀 **Full REST Client**: Support for GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS
- 📁 **Collections**: Organize requests into folders and collections
- 📜 **History**: Track all your requests automatically
- 🔧 **.http File Support**: Supports .http/.rest files with syntax highlighting
- 🔐 **Authentication**: Basic Auth, Bearer Token, and API Key support
- 📊 **Response Viewer**: Syntax highlighting, headers, and timing info
- 📋 **Copy as cURL**: Export any request as a cURL command

## Quick Start

1. Click the curl-code icon in the Activity Bar
2. Click "New Request" or press `Ctrl+Shift+N`
3. Enter a URL and click "Send" or press `Ctrl+Enter`

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

- Organize requests into collections and folders
- Save requests for reuse
- Import/export collections as JSON

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