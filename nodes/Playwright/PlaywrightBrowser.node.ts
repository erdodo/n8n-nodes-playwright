import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { launchBrowser, closeBrowser } from './shared/browserManager';
import {
	DEFAULT_USER_AGENT,
	DEFAULT_VIEWPORT_WIDTH,
	DEFAULT_VIEWPORT_HEIGHT,
	DEFAULT_LOCALE,
	DEFAULT_TIMEZONE,
	DEFAULT_BROWSER_TYPE,
} from './shared/stealthConfig';
import type { BrowserTypeName } from './shared/types';

export class PlaywrightBrowser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Playwright Browser',
		name: 'playwrightBrowser',
		icon: 'file:../../icons/playwright.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Open and close browser sessions with anti-bot stealth protection',
		defaults: {
			name: 'Playwright Browser',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Open',
						value: 'open',
						description: 'Open a new browser session',
						action: 'Open a new browser session',
					},
					{
						name: 'Close',
						value: 'close',
						description: 'Close an existing browser session',
						action: 'Close an existing browser session',
					},
				],
				default: 'open',
			},
			// Close operation: session ID from input
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionData?.sessionId }}',
				description: 'The session ID to close (auto-filled from previous node output)',
				displayOptions: {
					show: {
						operation: ['close'],
					},
				},
			},
			// Advanced Browser Settings (hidden by default via collection)
			{
				displayName: 'Browser Settings',
				name: 'browserSettings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Browser Type',
						name: 'browserType',
						type: 'options',
						options: [
							{ name: 'Chromium', value: 'chromium' },
							{ name: 'Firefox', value: 'firefox' },
							{ name: 'WebKit', value: 'webkit' },
						],
						default: DEFAULT_BROWSER_TYPE,
						description: 'Which browser engine to use',
					},
					{
						displayName: 'Headless',
						name: 'headless',
						type: 'boolean',
						default: true,
						description: 'Whether to run browser in headless mode (invisible)',
					},
					{
						displayName: 'Stealth Mode',
						name: 'stealth',
						type: 'boolean',
						default: true,
						description: 'Whether to enable anti-bot detection measures (recommended)',
					},
					{
						displayName: 'User Agent',
						name: 'userAgent',
						type: 'string',
						default: DEFAULT_USER_AGENT,
						description: 'Custom User-Agent string',
					},
					{
						displayName: 'Viewport Width',
						name: 'viewportWidth',
						type: 'number',
						default: DEFAULT_VIEWPORT_WIDTH,
						description: 'Browser viewport width in pixels',
					},
					{
						displayName: 'Viewport Height',
						name: 'viewportHeight',
						type: 'number',
						default: DEFAULT_VIEWPORT_HEIGHT,
						description: 'Browser viewport height in pixels',
					},
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'string',
						default: DEFAULT_LOCALE,
						description: 'Browser locale (e.g. en-US, tr-TR)',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: DEFAULT_TIMEZONE,
						description: 'Browser timezone (e.g. Europe/Istanbul)',
					},
					{
						displayName: 'Proxy Server',
						name: 'proxyServer',
						type: 'string',
						default: '',
						placeholder: 'http://proxy:8080',
						description: 'Proxy server URL (optional)',
					},
					{
						displayName: 'Proxy Username',
						name: 'proxyUsername',
						type: 'string',
						default: '',
						description: 'Proxy authentication username',
					},
					{
						displayName: 'Proxy Password',
						name: 'proxyPassword',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'Proxy authentication password',
					},
					{
						displayName: 'Extra HTTP Headers',
						name: 'extraHeaders',
						type: 'json',
						default: '{}',
						description: 'Additional HTTP headers as JSON object',
					},
				],
				displayOptions: {
					show: {
						operation: ['open'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'open') {
					const settings = this.getNodeParameter('browserSettings', i, {}) as {
						browserType?: BrowserTypeName;
						headless?: boolean;
						stealth?: boolean;
						userAgent?: string;
						viewportWidth?: number;
						viewportHeight?: number;
						locale?: string;
						timezone?: string;
						proxyServer?: string;
						proxyUsername?: string;
						proxyPassword?: string;
						extraHeaders?: string;
					};

					let extraHeaders: Record<string, string> = {};
					if (settings.extraHeaders) {
						try {
							extraHeaders = JSON.parse(settings.extraHeaders) as Record<string, string>;
						} catch (_e) {
							throw new NodeOperationError(this.getNode(), 'Extra HTTP Headers must be valid JSON', { itemIndex: i });
						}
					}

					const { sessionData } = await launchBrowser({
						browserType: settings.browserType ?? DEFAULT_BROWSER_TYPE,
						headless: settings.headless ?? true,
						userAgent: settings.userAgent ?? DEFAULT_USER_AGENT,
						viewportWidth: settings.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH,
						viewportHeight: settings.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT,
						locale: settings.locale ?? DEFAULT_LOCALE,
						timezone: settings.timezone ?? DEFAULT_TIMEZONE,
						stealth: settings.stealth ?? true,
						proxy: settings.proxyServer
							? {
									server: settings.proxyServer,
									username: settings.proxyUsername,
									password: settings.proxyPassword,
								}
							: undefined,
						extraHeaders,
					});

					returnData.push({
						json: {
							...items[i].json,
							sessionData,
							operation: 'open',
							success: true,
						},
						pairedItem: i,
					});
				} else if (operation === 'close') {
					const sessionId = this.getNodeParameter('sessionId', i) as string;

					if (!sessionId) {
						throw new NodeOperationError(this.getNode(), 'Session ID is required to close a browser session', { itemIndex: i });
					}

					await closeBrowser(sessionId);

					returnData.push({
						json: {
							...items[i].json,
							operation: 'close',
							sessionId,
							success: true,
						},
						pairedItem: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: i,
					});
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
