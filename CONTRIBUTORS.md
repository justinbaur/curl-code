# Contributors Guide

Welcome to the curl-code project! This guide will help you set up the development environment and run tests.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 24.0.0
- **npm**: >= 11.0.0
- **cURL**: Required for the extension to function (usually pre-installed on most systems)
- **VS Code**: >= 1.108.0

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/justinbaur/curl-code.git
cd curl-code
```

### 2. Install Dependencies

Install root dependencies:
```bash
npm install
```

Install webview dependencies:
```bash
cd webview-ui
npm install
cd ..
```

## Project Structure

```
curl-code/
├── src/                      # Source code
│   ├── curl/                 # cURL integration
│   ├── services/             # Core services
│   ├── parsers/              # File parsers
│   ├── providers/            # VS Code providers
│   └── test/                 # Test files
│       ├── suite/
│       │   ├── unit/         # Unit tests
│       │   └── integration/  # Integration tests
│       ├── fixtures/         # Test data
│       ├── mocks/            # Mock objects
│       └── utils/            # Test utilities
├── webview-ui/               # React UI components
├── dist/                     # Compiled extension
├── out/                      # Compiled tests
└── coverage/                 # Test coverage reports
```

## Development Workflow

### 1. Before Starting Development

```bash
# Make sure everything is up to date
npm install
npm run build:all
```

### 2. Make Your Changes

Edit source files in the `src/` directory or webview files in `webview-ui/`.

### 3. Compile and Test

```bash
# Compile TypeScript
npm run compile

# Compile tests
npm run compile-tests

# Run tests
npm test
```

### 4. Run Linter

```bash
# Check for linting errors
npm run lint
```

### 5. Test in VS Code

Press `F5` to launch the extension in a new VS Code window and test your changes.

## Running Tests

The project has a comprehensive test suite covering unit tests, integration tests, and webview tests.

### Quick Test Commands

```bash
# Run all tests (unit + extension)
npm test

# Run all tests including webview
npm run test:all
```

### Individual Test Suites

#### Unit Tests

Unit tests cover pure functions without VS Code API dependencies:

```bash
# Run unit tests only (fast, no VS Code required)
npm run test:unit

# Unit tests with coverage report
npm run test:coverage:unit
```

#### Integration Tests

Integration tests run in a VS Code environment and test services:

```bash
# Run integration tests (requires VS Code)
npm run test:integration
```

#### Extension Tests

Run all tests in VS Code test environment:

```bash
# Run extension tests
npm run test:extension
```

#### Webview Tests

Test the React UI components:

```bash
# Run webview tests
npm run test:webview

# Run webview tests in watch mode
npm run test:webview:watch

# Run webview tests with UI
npm run test:webview:ui

# Webview tests with coverage
cd webview-ui && npm run test:coverage
```

### Coverage Reports

Generate test coverage reports:

```bash
# Unit test coverage
npm run test:coverage:unit

# Extension test coverage
npm run test:coverage:extension

# All coverage reports
npm run test:coverage:all
```

Coverage reports are generated in the `coverage/` directory.

### E2E Tests

End-to-end tests simulate full user workflows:

```bash
npm run test:e2e
```

## Writing Tests

### Unit Test Example

```typescript
// src/test/suite/unit/myModule.test.ts
import { expect } from 'chai';
import { myFunction } from '../../../path/to/module';

describe('MyModule', () => {
    it('should do something', () => {
        const result = myFunction();
        expect(result).to.equal('expected');
    });
});
```

### Integration Test Example

```typescript
// src/test/suite/integration/myService.integration.test.ts
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { MyService } from '../../../services/MyService';

describe('MyService Integration', () => {
    let getConfigStub: sinon.SinonStub;

    beforeEach(() => {
        const mockConfig = { get: sinon.stub() };
        getConfigStub = sinon.stub(vscode.workspace, 'getConfiguration')
            .returns(mockConfig as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should work with VS Code APIs', async () => {
        const service = new MyService();
        await service.doSomething();
        expect(getConfigStub.called).to.be.true;
    });
});
```

## Testing Best Practices

1. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
2. **Descriptive Names**: Use "should do X when Y" pattern for test names
3. **Isolation**: Each test should be independent
4. **Cleanup**: Always restore stubs/mocks in `afterEach()`
5. **Mock External Dependencies**: Stub VS Code APIs, file system, and child processes
6. **Test Events**: Verify that services emit appropriate events
7. **Cover Edge Cases**: Test both happy paths and error scenarios

## Debugging Tests

### Debug in VS Code

1. Set breakpoints in your test files
2. Open the "Run and Debug" panel (`Ctrl+Shift+D`)
3. Select "Extension Tests" from the dropdown
4. Press `F5` to start debugging

### Debug Individual Tests

Add `.only` to run a single test:

```typescript
it.only('should test this specific case', () => {
    // This test will run alone
});
```

## Common Issues

### cURL Not Found

Ensure cURL is installed and in your PATH:
```bash
curl --version
```

Download from: https://curl.se/download.html

### Test Compilation Errors

Clean and rebuild:
```bash
rm -rf out/
npm run compile-tests
```

### VS Code API Mocking Issues

Integration tests use `sinon.stub()` on VS Code APIs, not module mocking. See existing tests for examples.

## Publishing

For maintainers only:

```bash
# Build for production
npm run vscode:prepublish

# Publish to VS Code Marketplace
npm run deploy
```

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [cURL Documentation](https://curl.se/docs/)
- [Mocha Test Framework](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [Sinon.JS Mocking](https://sinonjs.org/)

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/justinbaur/curl-code/issues)
- **Discussions**: [GitHub Discussions](https://github.com/justinbaur/curl-code/discussions)

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Thank you for contributing to curl-code! 🚀
