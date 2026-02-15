# Claude Instructions for curl-code Project

This document contains project-specific instructions for working with the curl-code VS Code extension.

## Node.js Environment Setup

This project uses Node.js v24 (specified in `.nvmrc`).

**IMPORTANT**: Before running any npm commands, you MUST activate the correct Node.js version:

```bash
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use
```

This command:
1. Changes to the project directory
2. Sources nvm (Node Version Manager)
3. Uses `nvm use` without a version - this automatically reads the `.nvmrc` file and activates Node v24

## Running npm Commands

Always prefix npm commands with the nvm setup:

```bash
# Compile tests
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run compile-tests

# Run unit tests
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run test:unit

# Run integration tests
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run test:integration

# Run extension tests
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run test:extension

# Run all tests
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm test

# Install dependencies
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm install

# Build the project
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run build:all

# Run linter
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run lint
```

## Common Commands Quick Reference

| Task | Command |
|------|---------|
| **Setup Node** | `cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use` |
| **Compile** | `npm run compile` |
| **Compile Tests** | `npm run compile-tests` |
| **Unit Tests** | `npm run test:unit` |
| **Integration Tests** | `npm run test:integration` |
| **Extension Tests** | `npm run test:extension` |
| **All Tests** | `npm test` |
| **Lint** | `npm run lint` |
| **Build All** | `npm run build:all` |

## Project Structure

```
curl-code/
├── src/                      # TypeScript source code
│   ├── curl/                 # cURL integration logic
│   ├── services/             # Core services (Collections, History, Environment)
│   ├── parsers/              # .http file parser
│   ├── providers/            # VS Code tree/CodeLens providers
│   └── test/                 # All test files
│       ├── suite/
│       │   ├── unit/         # Unit tests (pure functions, no VS Code API)
│       │   └── integration/  # Integration tests (with VS Code API mocks)
│       ├── fixtures/         # Test data files
│       ├── mocks/            # Mock objects (MockExtensionContext, etc.)
│       └── utils/            # Test helper utilities
├── webview-ui/               # React UI components
├── out/                      # Compiled TypeScript (including tests)
├── dist/                     # Webpack bundled extension
└── .nvmrc                    # Node version specification (v24)
```

## Test Organization

### Unit Tests (`src/test/suite/unit/`)
Pure functions with no VS Code dependencies:
- `argumentBuilder.test.ts` - cURL command building
- `responseParser.test.ts` - HTTP response parsing
- `httpFileParser.test.ts` - .http file parsing

### Integration Tests (`src/test/suite/integration/`)
Services that use VS Code APIs (mocked with sinon):
- `executor.integration.test.ts` - cURL executor
- `collectionService.integration.test.ts` - Collection CRUD
- `historyService.integration.test.ts` - Request history
- `environmentService.integration.test.ts` - Environment variables

## Testing Workflow

1. **Compile tests** (required after code changes):
   ```bash
   cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run compile-tests
   ```

2. **Run tests**:
   - Unit tests only: `npm run test:unit` (fast, no VS Code - 49 tests)
   - Extension tests: `npm run test:extension` (includes integration tests in VS Code environment)
   - All tests: `npm test` (runs unit + extension tests)

3. **Debug tests**:
   - Open VS Code debugger
   - Select "Extension Tests" configuration
   - Set breakpoints
   - Press F5

## Important Notes

- **ALWAYS** run `nvm use` before npm commands
- Unit tests run with Mocha directly (no VS Code instance needed)
- Integration tests run in a VS Code test environment
- Tests use Chai for assertions and Sinon for stubbing
- Never mock the entire `vscode` module - stub specific APIs instead
- Clean up stubs with `sinon.restore()` in `afterEach()`

## Debugging Failed Tests

If tests fail:

1. Ensure Node v24 is active: `source ~/.nvm/nvm.sh && nvm use`
2. Clean and recompile: `rm -rf out/ && npm run compile-tests`
3. Check for TypeScript errors: `npm run compile`
4. Run tests with verbose output to see detailed errors
5. Check that all VS Code API stubs are properly configured

## File Watching During Development

For active development:

```bash
# Terminal 1: Watch and compile source code
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run watch

# Terminal 2: Watch and compile tests
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run watch-tests

# Terminal 3: Run tests as needed
cd /home/silverhat/Workspace/curl-code && source ~/.nvm/nvm.sh && nvm use && npm run test:unit
```

## Key Dependencies

- **TypeScript**: v5.7.3
- **VS Code API**: v1.108.0
- **Node**: v24.12.0
- **npm**: v11.8.0
- **Test Framework**: Mocha v11.7.5
- **Assertions**: Chai v6.2.2
- **Mocking**: Sinon v21.0.1
- **Test Runner**: @vscode/test-electron v2.4.1

---

**Remember**: When in doubt, always start with `nvm use` to ensure the correct Node.js version is active!
