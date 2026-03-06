/**
 * Monaco Editor setup for VS Code webview
 *
 * Configures Monaco to use locally bundled workers (via Vite ?worker imports)
 * and registers the instance with @monaco-editor/react so it skips CDN loading.
 */

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';

self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
        if (label === 'json') {
            return new jsonWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker();
        }
        return new editorWorker();
    }
};

// Use our bundled Monaco instance — no CDN fetch
loader.config({ monaco });
