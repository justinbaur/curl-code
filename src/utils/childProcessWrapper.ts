/**
 * Thin wrapper around child_process to allow stubbing in tests.
 * On macOS, child_process exports are non-configurable, so sinon cannot stub them directly.
 */

import * as childProcess from 'child_process';

export const childProcessFacade = {
	spawn: (...args: Parameters<typeof childProcess.spawn>): ReturnType<typeof childProcess.spawn> =>
		childProcess.spawn(...args)
};
