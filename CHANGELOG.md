# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.2.0]

### Added

- Advanced cURL flags tab with 35+ options across 12 categories (HTTP version, connection, cookies, proxy, SSL/TLS, redirects, retry, debug & compression, auth extensions, DNS/resolution, rate limiting, and more)
- Custom Flags textarea always visible at the bottom of the Advanced tab
- Response Log tab with color-coded verbose/debug output (info, request, response lines)
- Welcome views with guided actions for empty Collections, History, and Environments tree views
- JSON syntax highlighting in the request body editor using transparent textarea overlay

### Fixed

- Logger outputting trailing `undefined` when no data argument was provided

## [v0.1.1]

### Fixed

- Addressed CodeQL security reports
- Active environment not showing up in the status bar at the bottom
- Error creating an environment variable with the same name/key. Now it updates the variable instead.
- Incorrect shortcut usage in the README.md
- Missing new environment variable on environment tree item
- Dependency vulnerabilities

## [v0.1.0]

### Added

- Initial Release