# Next Steps to Complete curl-code Extension

The curl-code VS Code extension has been fully scaffolded and all code has been written. To build and test it, follow these steps:

## 1. Install Node.js and npm

The system doesn't have Node.js installed yet. Install it using:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Or using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

## 2. Install Dependencies

```bash
cd /home/silverhat/Workspace/curl-code

# Install extension host dependencies
npm install

# Install webview dependencies
cd webview-ui
npm install
cd ..
```

## 3. Build the Extension

```bash
# Build webview first
npm run build:webview

# Build extension host
npm run compile

# Or build everything
npm run build:all
```

## 4. Test the Extension

### Option 1: Using VS Code

1. Open the `curl-code` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. The extension will load in a new VS Code window

### Option 2: Using vsce

```bash
# Install vsce globally
npm install -g @vscode/vsce

# Package the extension
vsce package

# Install the .vsix file in VS Code
code --install-extension curl-code-0.1.0.vsix
```

## 5. Verify Installation

Once the extension is loaded:

1. **Check the Activity Bar**: You should see a curl-code icon
2. **Click the icon**: The sidebar should show Collections, History, and Environments views
3. **Create a new request**: Click "New Request" or press `Ctrl+Alt+N`
4. **Test a request**:
   - Enter a URL like `https://httpbin.org/get`
   - Click "Send" or press `Ctrl+Enter`
   - You should see the response in the bottom panel

## 6. Test .http Files

Create a test file:

```bash
cat > test.http << 'EOF'
### Test GET Request
GET https://httpbin.org/get
User-Agent: curl-code

### Test POST Request
POST https://httpbin.org/post
Content-Type: application/json

{
  "test": "data"
}
EOF
```

Open `test.http` in VS Code and you should see "Send Request" CodeLens buttons above each request.

## Troubleshooting

### cURL Not Found

If you get a "cURL not available" warning:

```bash
# Install cURL
sudo apt install curl

# Or on macOS
brew install curl
```

### Build Errors

If you encounter TypeScript or webpack errors:

```bash
# Clean and rebuild
rm -rf node_modules dist webview-ui/node_modules webview-ui/dist
npm install
cd webview-ui && npm install && cd ..
npm run build:all
```

### Extension Not Loading

1. Check the Extension Development Host console for errors
2. Verify all files compiled correctly in the `dist/` folder
3. Check that `dist/extension.js` and `dist/webview/main.js` exist

## Project Structure

The complete extension consists of:

- **Extension Host** (Node.js/TypeScript): `/src`
  - cURL integration
  - Tree view providers
  - Services for collections/history
  - HTTP file parser

- **Webview UI** (React/TypeScript): `/webview-ui`
  - Request builder interface
  - Response viewer
  - State management with Zustand

## What's Implemented

✅ Full HTTP method support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
✅ Request builder with tabs for params, headers, body, and auth
✅ Response viewer with syntax highlighting
✅ Collections and folder organization
✅ Request history tracking
✅ Environment variables
✅ .http file support with CodeLens
✅ Copy as cURL command
✅ cURL backend for stable HTTP requests
✅ VS Code native theming

## What Could Be Added Later

- Import/export Postman collections
- GraphQL support
- WebSocket support
- Request chaining
- Test scripts
- Mock servers
- More syntax highlighting for response bodies
- Diff view for responses
- Request templates
