import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { getPage } from './shared/browserManager';
import type { SessionData } from './shared/types';

export class PlaywrightPage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Playwright Page',
		name: 'playwrightPage',
		icon: 'file:../../icons/playwright.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Perform page actions: navigate, click, type, extract data, screenshot, and more',
		defaults: {
			name: 'Playwright Page',
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
						name: 'Navigate',
						value: 'navigate',
						description: 'Go to a URL',
						action: 'Navigate to a URL',
					},
					{
						name: 'Click',
						value: 'click',
						description: 'Click on an element',
						action: 'Click on an element',
					},
					{
						name: 'Type',
						value: 'type',
						description: 'Type text into an input field',
						action: 'Type text into an input field',
					},
					{
						name: 'Select',
						value: 'select',
						description: 'Select an option from a dropdown',
						action: 'Select an option from a dropdown',
					},
					{
						name: 'Hover',
						value: 'hover',
						description: 'Hover over an element',
						action: 'Hover over an element',
					},
					{
						name: 'Scroll',
						value: 'scroll',
						description: 'Scroll the page or an element',
						action: 'Scroll the page or an element',
					},
					{
						name: 'Wait',
						value: 'wait',
						description: 'Wait for an element or a fixed time',
						action: 'Wait for an element or a fixed time',
					},
					{
						name: 'Extract Data',
						value: 'extractData',
						description: 'Extract structured data from elements (table, list, etc.) as JSON',
						action: 'Extract structured data from elements as JSON',
					},
					{
						name: 'Screenshot',
						value: 'screenshot',
						description: 'Take a screenshot of the page or an element',
						action: 'Take a screenshot',
					},
					{
						name: 'Evaluate JavaScript',
						value: 'evaluate',
						description: 'Run custom JavaScript on the page',
						action: 'Run custom JavaScript on the page',
					},
					{
						name: 'Get Page Info',
						value: 'getPageInfo',
						description: 'Get page title, URL, cookies, and HTML',
						action: 'Get page information',
					},
					{
						name: 'Press Key',
						value: 'pressKey',
						description: 'Press a keyboard key (Enter, Tab, Escape, etc.)',
						action: 'Press a keyboard key',
					},
				],
				default: 'navigate',
			},
			// Session ID (auto-filled from previous node)
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionData?.sessionId }}',
				description: 'Browser session ID (auto-filled from PlaywrightBrowser output)',
			},
			// --- Navigate ---
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com',
				description: 'The URL to navigate to',
				displayOptions: { show: { operation: ['navigate'] } },
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
				default: 'load',
				description: 'When to consider navigation complete',
				displayOptions: { show: { operation: ['navigate'] } },
			},
			// --- Click ---
			{
				displayName: 'Selector',
				name: 'clickSelector',
				type: 'string',
				default: '',
				placeholder: '#submit-button or //button[@type="submit"]',
				description: 'CSS or XPath selector of the element to click',
				displayOptions: { show: { operation: ['click'] } },
				required: true,
			},
			{
				displayName: 'Click Options',
				name: 'clickOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['click'] } },
				options: [
					{
						displayName: 'Button',
						name: 'button',
						type: 'options',
						options: [
							{ name: 'Left', value: 'left' },
							{ name: 'Right', value: 'right' },
							{ name: 'Middle', value: 'middle' },
						],
						default: 'left',
					},
					{
						displayName: 'Click Count',
						name: 'clickCount',
						type: 'number',
						default: 1,
						description: 'Number of clicks (2 for double-click)',
					},
					{
						displayName: 'Delay (Ms)',
						name: 'delay',
						type: 'number',
						default: 0,
						description: 'Delay between mousedown and mouseup in ms',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 30000,
					},
					{
						displayName: 'Wait After Click (Ms)',
						name: 'waitAfter',
						type: 'number',
						default: 0,
						description: 'Time to wait after clicking',
					},
				],
			},
			// --- Type ---
			{
				displayName: 'Selector',
				name: 'typeSelector',
				type: 'string',
				default: '',
				placeholder: '#email-input or input[name="email"]',
				description: 'CSS or XPath selector of the input field',
				displayOptions: { show: { operation: ['type'] } },
				required: true,
			},
			{
				displayName: 'Text',
				name: 'typeText',
				type: 'string',
				default: '',
				description: 'Text to type into the field',
				displayOptions: { show: { operation: ['type'] } },
				required: true,
			},
			{
				displayName: 'Type Options',
				name: 'typeOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['type'] } },
				options: [
					{
						displayName: 'Clear First',
						name: 'clearFirst',
						type: 'boolean',
						default: true,
						description: 'Whether to clear the field before typing',
					},
					{
						displayName: 'Typing Delay (Ms)',
						name: 'delay',
						type: 'number',
						default: 50,
						description: 'Delay between key presses in ms (humanized typing)',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 30000,
					},
				],
			},
			// --- Select ---
			{
				displayName: 'Selector',
				name: 'selectSelector',
				type: 'string',
				default: '',
				placeholder: 'select#country',
				description: 'CSS selector of the select element',
				displayOptions: { show: { operation: ['select'] } },
				required: true,
			},
			{
				displayName: 'Value',
				name: 'selectValue',
				type: 'string',
				default: '',
				description: 'Value to select',
				displayOptions: { show: { operation: ['select'] } },
				required: true,
			},
			// --- Hover ---
			{
				displayName: 'Selector',
				name: 'hoverSelector',
				type: 'string',
				default: '',
				placeholder: '.menu-item',
				description: 'CSS or XPath selector of the element to hover',
				displayOptions: { show: { operation: ['hover'] } },
				required: true,
			},
			// --- Scroll ---
			{
				displayName: 'Scroll Target',
				name: 'scrollTarget',
				type: 'options',
				options: [
					{ name: 'Page', value: 'page' },
					{ name: 'Element', value: 'element' },
				],
				default: 'page',
				displayOptions: { show: { operation: ['scroll'] } },
			},
			{
				displayName: 'Selector',
				name: 'scrollSelector',
				type: 'string',
				default: '',
				placeholder: '.scrollable-container',
				description: 'CSS selector of the element to scroll (only for Element target)',
				displayOptions: { show: { operation: ['scroll'], scrollTarget: ['element'] } },
			},
			{
				displayName: 'Scroll X',
				name: 'scrollX',
				type: 'number',
				default: 0,
				description: 'Horizontal scroll amount in pixels',
				displayOptions: { show: { operation: ['scroll'] } },
			},
			{
				displayName: 'Scroll Y',
				name: 'scrollY',
				type: 'number',
				default: 500,
				description: 'Vertical scroll amount in pixels',
				displayOptions: { show: { operation: ['scroll'] } },
			},
			// --- Wait ---
			{
				displayName: 'Wait Type',
				name: 'waitType',
				type: 'options',
				options: [
					{ name: 'Selector', value: 'selector' },
					{ name: 'Fixed Time', value: 'time' },
					{ name: 'Navigation', value: 'navigation' },
				],
				default: 'selector',
				displayOptions: { show: { operation: ['wait'] } },
			},
			{
				displayName: 'Selector',
				name: 'waitSelector',
				type: 'string',
				default: '',
				placeholder: '#loaded-content',
				description: 'CSS selector to wait for',
				displayOptions: { show: { operation: ['wait'], waitType: ['selector'] } },
			},
			{
				displayName: 'Wait State',
				name: 'waitState',
				type: 'options',
				options: [
					{ name: 'Visible', value: 'visible' },
					{ name: 'Hidden', value: 'hidden' },
					{ name: 'Attached', value: 'attached' },
					{ name: 'Detached', value: 'detached' },
				],
				default: 'visible',
				displayOptions: { show: { operation: ['wait'], waitType: ['selector'] } },
			},
			{
				displayName: 'Time (Ms)',
				name: 'waitTime',
				type: 'number',
				default: 1000,
				description: 'Fixed wait time in milliseconds',
				displayOptions: { show: { operation: ['wait'], waitType: ['time'] } },
			},
			{
				displayName: 'Timeout (Ms)',
				name: 'waitTimeout',
				type: 'number',
				default: 30000,
				displayOptions: { show: { operation: ['wait'] } },
			},
			// --- Extract Data ---
			{
				displayName: 'Selector',
				name: 'extractSelector',
				type: 'string',
				default: '',
				placeholder: 'table.data-table or ul.items > li',
				description: 'CSS selector for the elements to extract data from',
				displayOptions: { show: { operation: ['extractData'] } },
				required: true,
			},
			{
				displayName: 'Extract Mode',
				name: 'extractMode',
				type: 'options',
				options: [
					{
						name: 'Table',
						value: 'table',
						description: 'Extract HTML table as array of objects',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Extract list items as array of text values',
					},
					{
						name: 'Attributes',
						value: 'attributes',
						description: 'Extract specified attributes from matched elements',
					},
					{
						name: 'HTML',
						value: 'html',
						description: 'Extract innerHTML of matched elements',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Extract text content of matched elements',
					},
				],
				default: 'table',
				displayOptions: { show: { operation: ['extractData'] } },
			},
			{
				displayName: 'Attributes',
				name: 'extractAttributes',
				type: 'string',
				default: 'href,title,src',
				placeholder: 'href,title,src,data-id',
				description: 'Comma-separated attribute names to extract',
				displayOptions: { show: { operation: ['extractData'], extractMode: ['attributes'] } },
			},
			// --- Screenshot ---
			{
				displayName: 'Screenshot Target',
				name: 'screenshotTarget',
				type: 'options',
				options: [
					{ name: 'Full Page', value: 'fullPage' },
					{ name: 'Visible Area', value: 'viewport' },
					{ name: 'Element', value: 'element' },
				],
				default: 'fullPage',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			{
				displayName: 'Selector',
				name: 'screenshotSelector',
				type: 'string',
				default: '',
				placeholder: '#main-content',
				description: 'CSS selector of the element to screenshot',
				displayOptions: { show: { operation: ['screenshot'], screenshotTarget: ['element'] } },
			},
			{
				displayName: 'Output Format',
				name: 'screenshotFormat',
				type: 'options',
				options: [
					{ name: 'PNG', value: 'png' },
					{ name: 'JPEG', value: 'jpeg' },
				],
				default: 'png',
				displayOptions: { show: { operation: ['screenshot'] } },
			},
			// --- Evaluate ---
			{
				displayName: 'JavaScript Code',
				name: 'jsCode',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				placeholder: 'return document.title;',
				description:
					'JavaScript code to execute in the page context. Use "return" to get a result.',
				displayOptions: { show: { operation: ['evaluate'] } },
				required: true,
			},
			// --- Get Page Info ---
			{
				displayName: 'Include',
				name: 'pageInfoInclude',
				type: 'multiOptions',
				options: [
					{ name: 'Title', value: 'title' },
					{ name: 'URL', value: 'url' },
					{ name: 'Cookies', value: 'cookies' },
					{ name: 'HTML', value: 'html' },
				],
				default: ['title', 'url'],
				displayOptions: { show: { operation: ['getPageInfo'] } },
			},
			// --- Press Key ---
			{
				displayName: 'Key',
				name: 'pressKeyValue',
				type: 'string',
				default: 'Enter',
				placeholder: 'Enter, Tab, Escape, ArrowDown, etc.',
				description: 'Keyboard key to press',
				displayOptions: { show: { operation: ['pressKey'] } },
				required: true,
			},
			{
				displayName: 'Selector (Optional)',
				name: 'pressKeySelector',
				type: 'string',
				default: '',
				placeholder: '#search-input',
				description: 'Focus this element before pressing the key (optional)',
				displayOptions: { show: { operation: ['pressKey'] } },
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
				let result: Record<string, unknown> = { operation, success: true };

				switch (operation) {
					case 'navigate': {
						const url = this.getNodeParameter('url', i) as string;
						const waitUntil = this.getNodeParameter('waitUntil', i) as
							| 'load'
							| 'domcontentloaded'
							| 'networkidle'
							| 'commit';
						await page.goto(url, { waitUntil, timeout: 60000 });
						result.url = page.url();
						result.title = await page.title();
						break;
					}

					case 'click': {
						const selector = this.getNodeParameter('clickSelector', i) as string;
						const options = this.getNodeParameter('clickOptions', i, {}) as {
							button?: 'left' | 'right' | 'middle';
							clickCount?: number;
							delay?: number;
							timeout?: number;
							waitAfter?: number;
						};
						await page.click(selector, {
							button: options.button ?? 'left',
							clickCount: options.clickCount ?? 1,
							delay: options.delay ?? 0,
							timeout: options.timeout ?? 30000,
						});
						if (options.waitAfter && options.waitAfter > 0) {
							await page.waitForTimeout(options.waitAfter);
						}
						result.selector = selector;
						break;
					}

					case 'type': {
						const selector = this.getNodeParameter('typeSelector', i) as string;
						const text = this.getNodeParameter('typeText', i) as string;
						const options = this.getNodeParameter('typeOptions', i, {}) as {
							clearFirst?: boolean;
							delay?: number;
							timeout?: number;
						};

						await page.waitForSelector(selector, { timeout: options.timeout ?? 30000 });

						if (options.clearFirst !== false) {
							await page.click(selector, { clickCount: 3 });
							await page.keyboard.press('Backspace');
						}

						await page.type(selector, text, { delay: options.delay ?? 50 });
						result.selector = selector;
						result.text = text;
						break;
					}

					case 'select': {
						const selector = this.getNodeParameter('selectSelector', i) as string;
						const value = this.getNodeParameter('selectValue', i) as string;
						const selected = await page.selectOption(selector, value);
						result.selector = selector;
						result.selectedValues = selected;
						break;
					}

					case 'hover': {
						const selector = this.getNodeParameter('hoverSelector', i) as string;
						await page.hover(selector);
						result.selector = selector;
						break;
					}

					case 'scroll': {
						const scrollTarget = this.getNodeParameter('scrollTarget', i) as string;
						const scrollX = this.getNodeParameter('scrollX', i) as number;
						const scrollY = this.getNodeParameter('scrollY', i) as number;

						if (scrollTarget === 'element') {
							const selector = this.getNodeParameter('scrollSelector', i) as string;
							await page.evaluate(
								({ sel, x, y }: { sel: string; x: number; y: number }) => {
									const el = document.querySelector(sel);
									if (el) el.scrollBy(x, y);
								},
								{ sel: selector, x: scrollX, y: scrollY },
							);
							result.selector = selector;
						} else {
							await page.evaluate(({ x, y }: { x: number; y: number }) => window.scrollBy(x, y), {
								x: scrollX,
								y: scrollY,
							});
						}
						result.scrollX = scrollX;
						result.scrollY = scrollY;
						break;
					}

					case 'wait': {
						const waitType = this.getNodeParameter('waitType', i) as string;
						const timeout = this.getNodeParameter('waitTimeout', i, 30000) as number;

						if (waitType === 'selector') {
							const selector = this.getNodeParameter('waitSelector', i) as string;
							const state = this.getNodeParameter('waitState', i, 'visible') as
								| 'visible'
								| 'hidden'
								| 'attached'
								| 'detached';
							await page.waitForSelector(selector, { state, timeout });
							result.selector = selector;
							result.state = state;
						} else if (waitType === 'time') {
							const waitTime = this.getNodeParameter('waitTime', i) as number;
							await page.waitForTimeout(waitTime);
							result.waitedMs = waitTime;
						} else if (waitType === 'navigation') {
							await page.waitForNavigation({ timeout });
							result.url = page.url();
						}
						break;
					}

					case 'extractData': {
						const selector = this.getNodeParameter('extractSelector', i) as string;
						const mode = this.getNodeParameter('extractMode', i) as string;

						if (mode === 'table') {
							const tableData = await page.evaluate((sel: string) => {
								const table = document.querySelector(sel);
								if (!table) return [];
								const headers: string[] = [];
								const headerCells = table.querySelectorAll(
									'thead th, thead td, tr:first-child th, tr:first-child td',
								);
								headerCells.forEach((cell: Element) =>
									headers.push((cell as HTMLElement).innerText.trim()),
								);
								const rows: Record<string, string>[] = [];
								const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
								bodyRows.forEach((row: Element) => {
									const cells = row.querySelectorAll('td, th');
									const rowData: Record<string, string> = {};
									cells.forEach((cell: Element, idx: number) => {
										const key = headers[idx] || `column_${idx}`;
										rowData[key] = (cell as HTMLElement).innerText.trim();
									});
									if (Object.keys(rowData).length > 0) rows.push(rowData);
								});
								return rows;
							}, selector);
							result.data = tableData;
							result.count = (tableData as unknown[]).length;
						} else if (mode === 'list') {
							const listData = await page.evaluate((sel: string) => {
								const elements = document.querySelectorAll(sel);
								return Array.from(elements).map((el) => (el as HTMLElement).innerText.trim());
							}, selector);
							result.data = listData;
							result.count = (listData as unknown[]).length;
						} else if (mode === 'attributes') {
							const attrsStr = this.getNodeParameter('extractAttributes', i) as string;
							const attrNames = attrsStr.split(',').map((a) => a.trim());
							const attrData = await page.evaluate(
								({ sel, attrs }: { sel: string; attrs: string[] }) => {
									const elements = document.querySelectorAll(sel);
									return Array.from(elements).map((el: Element) => {
										const obj: Record<string, string | null> = {};
										attrs.forEach((attr: string) => {
											obj[attr] = el.getAttribute(attr);
										});
										return obj;
									});
								},
								{ sel: selector, attrs: attrNames },
							);
							result.data = attrData;
							result.count = (attrData as unknown[]).length;
						} else if (mode === 'html') {
							const htmlData = await page.evaluate((sel: string) => {
								const elements = document.querySelectorAll(sel);
								return Array.from(elements).map((el) => el.innerHTML);
							}, selector);
							result.data = htmlData;
							result.count = (htmlData as unknown[]).length;
						} else if (mode === 'text') {
							const textData = await page.evaluate((sel: string) => {
								const elements = document.querySelectorAll(sel);
								return Array.from(elements).map((el) => (el as HTMLElement).innerText.trim());
							}, selector);
							result.data = textData;
							result.count = (textData as unknown[]).length;
						}
						break;
					}

					case 'screenshot': {
						const target = this.getNodeParameter('screenshotTarget', i) as string;
						const format = this.getNodeParameter('screenshotFormat', i, 'png') as 'png' | 'jpeg';

						let screenshotBuffer: Uint8Array;
						if (target === 'element') {
							const selector = this.getNodeParameter('screenshotSelector', i) as string;
							const element = await page.waitForSelector(selector);
							if (!element)
								throw new NodeOperationError(this.getNode(), `Element not found: ${selector}`, {
									itemIndex: i,
								});
							screenshotBuffer = await element.screenshot({ type: format });
						} else {
							screenshotBuffer = await page.screenshot({
								type: format,
								fullPage: target === 'fullPage',
							});
						}

						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(screenshotBuffer),
							`screenshot.${format}`,
							format === 'png' ? 'image/png' : 'image/jpeg',
						);

						returnData.push({
							json: {
								...items[i].json,
								sessionData: items[i].json.sessionData,
								operation,
								success: true,
							},
							binary: { screenshot: binaryData },
							pairedItem: i,
						});
						continue;
					}

					case 'evaluate': {
						const jsCode = this.getNodeParameter('jsCode', i) as string;
						const evalResult = await page.evaluate((code: string) => {
							const fn = new Function(code);
							return fn();
						}, jsCode);
						result.result = evalResult;
						break;
					}

					case 'getPageInfo': {
						const include = this.getNodeParameter('pageInfoInclude', i) as string[];
						const info: Record<string, unknown> = {};

						if (include.includes('title')) {
							info.title = await page.title();
						}
						if (include.includes('url')) {
							info.url = page.url();
						}
						if (include.includes('cookies')) {
							info.cookies = await page.context().cookies();
						}
						if (include.includes('html')) {
							info.html = await page.content();
						}
						result.pageInfo = info;
						break;
					}

					case 'pressKey': {
						const key = this.getNodeParameter('pressKeyValue', i) as string;
						const keySelector = this.getNodeParameter('pressKeySelector', i, '') as string;

						if (keySelector) {
							await page.focus(keySelector);
						}
						await page.keyboard.press(key);
						result.key = key;
						break;
					}
				}

				// Pass sessionData through for chaining
				const sessionData = items[i].json.sessionData as SessionData | undefined;
				returnData.push({
					json: {
						...items[i].json,
						sessionData,
						...result,
					},
					pairedItem: i,
				});
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
