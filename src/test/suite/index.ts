import * as path from 'path';
import { glob } from 'glob';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Mocha = require('mocha');

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		color: true,
		timeout: 10000, // 10 seconds default timeout
		reporter: 'spec',
		slow: 500 // Tests slower than 500ms are marked as slow
	});

	const testsRoot = path.resolve(__dirname, '..');

	try {
		// Find all test files
		const files = await glob('**/**.test.js', { cwd: testsRoot });

		// Add files to the test suite
		files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

		// Run the mocha test
		return new Promise<void>((resolve, reject) => {
			try {
				mocha.run((failures: number) => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error('Error running tests:', err);
				reject(err);
			}
		});
	} catch (err) {
		console.error('Error loading test files:', err);
		throw err;
	}
}
