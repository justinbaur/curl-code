/**
 * Thin wrapper around fs/promises to allow stubbing in tests.
 * On macOS, fs/promises exports are non-configurable, so sinon cannot stub them directly.
 */

import { mkdir, readdir, readFile, writeFile, unlink } from 'fs/promises';
import type { PathLike, MakeDirectoryOptions } from 'fs';

export const fsFacade = {
	mkdir: (path: PathLike, options?: MakeDirectoryOptions & { recursive: true }): Promise<string | undefined> =>
		mkdir(path, options),
	readdir: (path: PathLike): Promise<string[]> =>
		readdir(path) as Promise<string[]>,
	readFile: (path: PathLike, encoding: BufferEncoding): Promise<string> =>
		readFile(path, encoding) as Promise<string>,
	writeFile: (path: PathLike, data: string, encoding?: BufferEncoding): Promise<void> =>
		writeFile(path, data, encoding),
	unlink: (path: PathLike): Promise<void> =>
		unlink(path)
};
