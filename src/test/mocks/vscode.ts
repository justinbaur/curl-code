/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from 'events';

/**
 * Mock VS Code Extension Context
 */
export class MockExtensionContext {
	subscriptions: { dispose(): any }[] = [];
	workspaceState: MockMemento;
	globalState: MockMemento & { setKeysForSync(keys: readonly string[]): void };
	secrets: MockSecretStorage;
	extensionUri: any;
	extensionPath: string;
	environmentVariableCollection: any;
	storagePath: string | undefined;
	globalStoragePath: string;
	globalStorageUri: { fsPath: string; toString(): string };
	storageUri: { fsPath: string; toString(): string } | undefined;
	logPath: string;
	logUri: { fsPath: string; toString(): string };
	extensionMode: number = 3; // ExtensionMode.Production

	constructor() {
		this.workspaceState = new MockMemento();
		this.globalState = new MockMemento() as any;
		this.globalState.setKeysForSync = () => {};
		this.secrets = new MockSecretStorage();
		this.extensionPath = '/mock/extension/path';
		this.globalStoragePath = '/mock/global/storage';
		this.globalStorageUri = { fsPath: '/mock/global/storage', toString: () => 'file:///mock/global/storage' };
		this.storageUri = { fsPath: '/mock/storage', toString: () => 'file:///mock/storage' };
		this.logPath = '/mock/log/path';
		this.logUri = { fsPath: '/mock/log/path', toString: () => 'file:///mock/log/path' };
	}

	asAbsolutePath(relativePath: string): string {
		return `${this.extensionPath}/${relativePath}`;
	}
}

/**
 * Mock VS Code Memento (State Storage)
 */
export class MockMemento {
	private storage = new Map<string, any>();

	keys(): readonly string[] {
		return Array.from(this.storage.keys());
	}

	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	get<T>(key: string, defaultValue?: T): T | undefined {
		return this.storage.has(key) ? this.storage.get(key) : defaultValue;
	}

	async update(key: string, value: any): Promise<void> {
		if (value === undefined) {
			this.storage.delete(key);
		} else {
			this.storage.set(key, value);
		}
	}

	// Helper for testing
	clear(): void {
		this.storage.clear();
	}
}

/**
 * Mock VS Code Secret Storage
 */
export class MockSecretStorage {
	private secrets = new Map<string, string>();
	private onDidChangeEmitter = new EventEmitter();

	async get(key: string): Promise<string | undefined> {
		return this.secrets.get(key);
	}

	async store(key: string, value: string): Promise<void> {
		this.secrets.set(key, value);
		this.onDidChangeEmitter.emit('change', { key });
	}

	async delete(key: string): Promise<void> {
		this.secrets.delete(key);
		this.onDidChangeEmitter.emit('change', { key });
	}

	get onDidChange() {
		return this.onDidChangeEmitter;
	}

	// Helper for testing
	clear(): void {
		this.secrets.clear();
	}
}

/**
 * Mock VS Code Output Channel
 */
export class MockOutputChannel {
	private output: string[] = [];
	name: string;

	constructor(name: string) {
		this.name = name;
	}

	append(value: string): void {
		this.output.push(value);
	}

	appendLine(value: string): void {
		this.output.push(value + '\n');
	}

	clear(): void {
		this.output = [];
	}

	show(): void {}
	hide(): void {}
	dispose(): void {}

	// Helper for testing
	getOutput(): string {
		return this.output.join('');
	}
}

/**
 * Mock VS Code Webview
 */
export class MockWebview {
	private messageHandlers: ((message: any) => any)[] = [];
	html: string = '';
	options: any = {};
	cspSource: string = 'mock-csp';

	onDidReceiveMessage(handler: (message: any) => any) {
		this.messageHandlers.push(handler);
		return { dispose: () => {} };
	}

	async postMessage(message: any): Promise<boolean> {
		// Simulate async message delivery
		return true;
	}

	asWebviewUri(uri: any): any {
		return uri;
	}

	// Helper for testing - simulate receiving a message from webview
	simulateMessage(message: any): void {
		this.messageHandlers.forEach(handler => handler(message));
	}
}

/**
 * Mock VS Code Webview Panel
 */
export class MockWebviewPanel {
	webview: MockWebview;
	title: string;
	viewType: string;
	options: any;
	private onDidDisposeEmitter = new EventEmitter();
	private onDidChangeViewStateEmitter = new EventEmitter();
	visible: boolean = true;
	active: boolean = true;
	viewColumn: number | undefined;

	constructor(viewType: string, title: string, showOptions: any, options: any) {
		this.viewType = viewType;
		this.title = title;
		this.options = options;
		this.webview = new MockWebview();
	}

	get onDidDispose() {
		return this.onDidDisposeEmitter;
	}

	get onDidChangeViewState() {
		return this.onDidChangeViewStateEmitter;
	}

	reveal(viewColumn?: number, preserveFocus?: boolean): void {
		this.visible = true;
		this.active = !preserveFocus;
	}

	dispose(): void {
		this.visible = false;
		this.onDidDisposeEmitter.emit('dispose');
	}
}

/**
 * Mock VS Code Window
 */
export class MockWindow {
	async showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
		return items[0];
	}

	async showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
		return items[0];
	}

	async showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
		return items[0];
	}

	async showInputBox(options?: any): Promise<string | undefined> {
		return 'mock-input';
	}

	async showQuickPick(items: any[], options?: any): Promise<any> {
		return Array.isArray(items) ? items[0] : undefined;
	}

	createOutputChannel(name: string): MockOutputChannel {
		return new MockOutputChannel(name);
	}

	createWebviewPanel(
		viewType: string,
		title: string,
		showOptions: any,
		options?: any
	): MockWebviewPanel {
		return new MockWebviewPanel(viewType, title, showOptions, options);
	}
}

/**
 * Mock VS Code Workspace
 */
export class MockWorkspace {
	workspaceFolders: any[] = [];
	name: string | undefined;

	getConfiguration(section?: string): any {
		return {
			get: (key: string, defaultValue?: any) => defaultValue,
			has: (key: string) => false,
			inspect: (key: string) => undefined,
			update: async (key: string, value: any) => {}
		};
	}

	async findFiles(include: string, exclude?: string): Promise<any[]> {
		return [];
	}
}

/**
 * Mock VS Code Commands
 */
export class MockCommands {
	private registeredCommands = new Map<string, (...args: any[]) => any>();

	registerCommand(command: string, callback: (...args: any[]) => any): { dispose(): any } {
		this.registeredCommands.set(command, callback);
		return {
			dispose: () => {
				this.registeredCommands.delete(command);
			}
		};
	}

	async executeCommand(command: string, ...rest: any[]): Promise<any> {
		const handler = this.registeredCommands.get(command);
		if (handler) {
			return handler(...rest);
		}
		return undefined;
	}

	getCommands(filterInternal?: boolean): Thenable<string[]> {
		return Promise.resolve(Array.from(this.registeredCommands.keys()));
	}

	// Helper for testing
	hasCommand(command: string): boolean {
		return this.registeredCommands.has(command);
	}
}

/**
 * Create a mock VS Code API instance
 */
export function createMockVSCode() {
	const window = new MockWindow();
	const workspace = new MockWorkspace();
	const commands = new MockCommands();

	return {
		window,
		workspace,
		commands,
		// Add other VS Code namespaces as needed
		Uri: {
			file: (path: string) => ({ fsPath: path, path }),
			parse: (value: string) => ({ fsPath: value, path: value })
		},
		ViewColumn: {
			One: 1,
			Two: 2,
			Three: 3
		},
		TreeItemCollapsibleState: {
			None: 0,
			Collapsed: 1,
			Expanded: 2
		}
	};
}
