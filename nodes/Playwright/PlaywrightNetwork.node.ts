import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { getPage } from './shared/browserManager';
import type { NetworkRequest, SessionData } from './shared/types';

export class PlaywrightNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Playwright Network',
		name: 'playwrightNetwork',
		icon: 'file:../../icons/playwright.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Monitor and capture all network requests when navigating to a page',
		defaults: {
			name: 'Playwright Network',
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
						name: 'Monitor',
						value: 'monitor',
						description: 'Navigate to a URL and capture all network requests',
						action: 'Monitor network requests while navigating',
					},
					{
						name: 'Capture Current',
						value: 'captureCurrent',
						description: 'Start capturing network requests on the current page (useful before triggering actions)',
						action: 'Capture network requests on current page',
					},
				],
				default: 'monitor',
			},
			// Session ID (auto-filled from previous node)
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionData?.sessionId }}',
				description: 'Browser session ID (auto-filled from PlaywrightBrowser output)',
			},
			// Monitor: URL
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com',
				description: 'The URL to navigate to while monitoring network traffic',
				displayOptions: { show: { operation: ['monitor'] } },
				required: true,
			},
			{
				displayName: 'Wait Until',
				name: 'waitUntil',
				type: 'options',
				options: [
					{ name: 'Load', value: 'load' },
					{ name: 'DOM Content Loaded', value: 'domcontentloaded' },
					{ name: 'Network Idle', value: 'networkidle' },
					{ name: 'Commit', value: 'commit' },
				],
				default: 'networkidle',
				description: 'When to consider navigation complete',
				displayOptions: { show: { operation: ['monitor'] } },
			},
			// Capture Current: duration
			{
				displayName: 'Capture Duration (Ms)',
				name: 'captureDuration',
				type: 'number',
				default: 5000,
				description: 'How long to capture network requests in milliseconds',
				displayOptions: { show: { operation: ['captureCurrent'] } },
			},
			// Filter settings
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'URL Pattern',
						name: 'urlPattern',
						type: 'string',
						default: '',
						placeholder: '.*api.*|.*graphql.*',
						description: 'Regex pattern to filter request URLs (empty = capture all)',
					},
					{
						displayName: 'Methods',
						name: 'methods',
						type: 'multiOptions',
						options: [
							{ name: 'GET', value: 'GET' },
							{ name: 'POST', value: 'POST' },
							{ name: 'PUT', value: 'PUT' },
							{ name: 'DELETE', value: 'DELETE' },
							{ name: 'PATCH', value: 'PATCH' },
							{ name: 'OPTIONS', value: 'OPTIONS' },
							{ name: 'HEAD', value: 'HEAD' },
						],
						default: [],
						description: 'Filter by HTTP methods (empty = all methods)',
					},
					{
						displayName: 'Resource Types',
						name: 'resourceTypes',
						type: 'multiOptions',
						options: [
							{ name: 'Document', value: 'document' },
							{ name: 'Stylesheet', value: 'stylesheet' },
							{ name: 'Image', value: 'image' },
							{ name: 'Media', value: 'media' },
							{ name: 'Font', value: 'font' },
							{ name: 'Script', value: 'script' },
							{ name: 'TextTrack', value: 'texttrack' },
							{ name: 'XHR', value: 'xhr' },
							{ name: 'Fetch', value: 'fetch' },
							{ name: 'EventSource', value: 'eventsource' },
							{ name: 'WebSocket', value: 'websocket' },
							{ name: 'Manifest', value: 'manifest' },
							{ name: 'Other', value: 'other' },
						],
						default: [],
						description: 'Filter by resource types (empty = all types)',
					},
					{
						displayName: 'Exclude URL Pattern',
						name: 'excludeUrlPattern',
						type: 'string',
						default: '',
						placeholder: '.*\\.png$|.*\\.jpg$|.*\\.css$',
						description: 'Regex pattern to exclude request URLs',
					},
					{
						displayName: 'Include Response Body',
						name: 'includeResponseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to include the response body (may increase memory usage)',
					},
					{
						displayName: 'Min Status Code',
						name: 'minStatusCode',
						type: 'number',
						default: 0,
						description: 'Minimum HTTP status code to include (0 = no filter)',
					},
					{
						displayName: 'Max Status Code',
						name: 'maxStatusCode',
						type: 'number',
						default: 0,
						description: 'Maximum HTTP status code to include (0 = no filter)',
					},
				],
			},
			// Advanced
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 60000,
						description: 'Maximum time to wait for navigation in milliseconds',
					},
					{
						displayName: 'Output Mode',
						name: 'outputMode',
						type: 'options',
						options: [
							{
								name: 'All Requests in One Item',
								value: 'single',
								description: 'Output all captured requests as an array in one item',
							},
							{
								name: 'One Item Per Request',
								value: 'multiple',
								description: 'Output each captured request as a separate item',
							},
						],
						default: 'single',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const sessionId = this.getNodeParameter('sessionId', i) as string;

				if (!sessionId) {
					throw new NodeOperationError(
						this.getNode(),
						'Session ID is required. Connect a PlaywrightBrowser node before this node.',
						{ itemIndex: i },
					);
				}

				const page = getPage(sessionId);
				const filters = this.getNodeParameter('filters', i, {}) as {
					urlPattern?: string;
					methods?: string[];
					resourceTypes?: string[];
					excludeUrlPattern?: string;
					includeResponseBody?: boolean;
					minStatusCode?: number;
					maxStatusCode?: number;
				};
				const options = this.getNodeParameter('options', i, {}) as {
					timeout?: number;
					outputMode?: string;
				};

				const capturedRequests: NetworkRequest[] = [];
				const urlRegex = filters.urlPattern ? new RegExp(filters.urlPattern, 'i') : null;
				const excludeRegex = filters.excludeUrlPattern
					? new RegExp(filters.excludeUrlPattern, 'i')
					: null;

				const requestHandler = (request: {
					url: () => string;
					method: () => string;
					headers: () => Record<string, string>;
					postData: () => string | null;
					resourceType: () => string;
				}) => {
					const reqUrl = request.url();
					const reqMethod = request.method();
					const reqResourceType = request.resourceType();

					// Apply filters
					if (urlRegex && !urlRegex.test(reqUrl)) return;
					if (excludeRegex && excludeRegex.test(reqUrl)) return;
					if (filters.methods && filters.methods.length > 0 && !filters.methods.includes(reqMethod))
						return;
					if (
						filters.resourceTypes &&
						filters.resourceTypes.length > 0 &&
						!filters.resourceTypes.includes(reqResourceType)
					)
						return;

					const networkReq: NetworkRequest = {
						url: reqUrl,
						method: reqMethod,
						headers: request.headers(),
						postData: request.postData(),
						resourceType: reqResourceType,
						status: null,
						statusText: null,
						responseHeaders: {},
						responseBody: null,
						timing: {
							startTime: Date.now(),
							endTime: 0,
							duration: 0,
						},
					};
					capturedRequests.push(networkReq);
				};

				const responseHandler = async (response: {
					url: () => string;
					status: () => number;
					statusText: () => string;
					headers: () => Record<string, string>;
					text: () => Promise<string>;
				}) => {
					const resUrl = response.url();
					const matchingReq = capturedRequests.find(
						(r) => r.url === resUrl && r.status === null,
					);
					if (matchingReq) {
						matchingReq.status = response.status();
						matchingReq.statusText = response.statusText();
						matchingReq.responseHeaders = response.headers();
						matchingReq.timing.endTime = Date.now();
						matchingReq.timing.duration =
							matchingReq.timing.endTime - matchingReq.timing.startTime;

						if (filters.includeResponseBody) {
							try {
								matchingReq.responseBody = await response.text();
							} catch (_e) {
								matchingReq.responseBody = '[Unable to read response body]';
							}
						}
					}
				};

				// Attach listeners
				page.on('request', requestHandler);
				page.on('response', responseHandler);

				try {
					if (operation === 'monitor') {
						const url = this.getNodeParameter('url', i) as string;
						const waitUntil = this.getNodeParameter('waitUntil', i) as
							| 'load'
							| 'domcontentloaded'
							| 'networkidle'
							| 'commit';
						const timeout = options.timeout ?? 60000;

						await page.goto(url, { waitUntil, timeout });
					} else if (operation === 'captureCurrent') {
						const duration = this.getNodeParameter('captureDuration', i) as number;
						await page.waitForTimeout(duration);
					}
				} finally {
					// Remove listeners
					page.removeListener('request', requestHandler);
					page.removeListener('response', responseHandler);
				}

				// Wait a bit for pending responses
				await page.waitForTimeout(500);

				// Apply status code filters
				let filteredRequests = capturedRequests;
				if (filters.minStatusCode && filters.minStatusCode > 0) {
					filteredRequests = filteredRequests.filter(
						(r) => r.status !== null && r.status >= (filters.minStatusCode as number),
					);
				}
				if (filters.maxStatusCode && filters.maxStatusCode > 0) {
					filteredRequests = filteredRequests.filter(
						(r) => r.status !== null && r.status <= (filters.maxStatusCode as number),
					);
				}

				const sessionData = items[i].json.sessionData as SessionData | undefined;

				if (options.outputMode === 'multiple') {
					for (const req of filteredRequests) {
						returnData.push({
							json: {
								...items[i].json,
								sessionData,
								operation,
								networkRequest: req,
							},
							pairedItem: i,
						});
					}
					if (filteredRequests.length === 0) {
						returnData.push({
							json: {
								...items[i].json,
								sessionData,
								operation,
								networkRequests: [],
								totalCaptured: 0,
							},
							pairedItem: i,
						});
					}
				} else {
					returnData.push({
						json: {
							...items[i].json,
							sessionData,
							operation,
							networkRequests: filteredRequests,
							totalCaptured: filteredRequests.length,
							pageUrl: page.url(),
							pageTitle: await page.title(),
						},
						pairedItem: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							...items[i].json,
							error: (error as Error).message,
						},
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
