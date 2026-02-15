import * as path from 'path';
import * as fs from 'fs';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download VS Code if needed
		const vscodeExecutablePath = await downloadAndUnzipVSCode();

		// Use the CLI wrapper instead of the Electron binary directly
		// The downloaded structure has: code (Electron binary) and bin/code (CLI wrapper)
		const binCodePath = path.join(path.dirname(vscodeExecutablePath), 'bin', 'code');
		const executableToUse = fs.existsSync(binCodePath) ? binCodePath : vscodeExecutablePath;

		// Download VS Code, unzip it and run the integration test
		await runTests({
			vscodeExecutablePath: executableToUse,
			extensionDevelopmentPath,
			extensionTestsPath,
			// Disable all extensions except the one being tested
			launchArgs: [
				'--disable-extensions',
				'--disable-workspace-trust',
				'--no-sandbox',
				'--disable-gpu'
			]
		});
	} catch (err) {
		console.error('Failed to run tests:', err);
		process.exit(1);
	}
}

main();
