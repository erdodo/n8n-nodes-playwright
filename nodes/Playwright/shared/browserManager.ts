import { chromium, firefox, webkit } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import type { BrowserTypeName, SessionData } from './types';
import { STEALTH_BROWSER_ARGS, STEALTH_INIT_SCRIPT } from './stealthConfig';

interface BrowserSession {
	browser: Browser;
	context: BrowserContext;
	page: Page;
}

const activeSessions = new Map<string, BrowserSession>();

function getBrowserType(name: BrowserTypeName) {
	switch (name) {
		case 'firefox':
			return firefox;
		case 'webkit':
			return webkit;
		default:
			return chromium;
	}
}

export async function launchBrowser(options: {
	browserType: BrowserTypeName;
	headless: boolean;
	userAgent: string;
	viewportWidth: number;
	viewportHeight: number;
	locale: string;
	timezone: string;
	stealth: boolean;
	proxy?: { server: string; username?: string; password?: string };
	extraHeaders?: Record<string, string>;
}): Promise<{ sessionData: SessionData; page: Page }> {
	const browserTypeInstance = getBrowserType(options.browserType);

	const launchOptions: Record<string, unknown> = {
		headless: options.headless,
		args: options.stealth ? STEALTH_BROWSER_ARGS : [],
	};

	if (options.proxy?.server) {
		launchOptions.proxy = {
			server: options.proxy.server,
			username: options.proxy.username,
			password: options.proxy.password,
		};
	}

	const browser = await browserTypeInstance.launch(launchOptions);

	const contextOptions: Record<string, unknown> = {
		userAgent: options.userAgent,
		viewport: { width: options.viewportWidth, height: options.viewportHeight },
		locale: options.locale,
		timezoneId: options.timezone,
		ignoreHTTPSErrors: true,
		javaScriptEnabled: true,
		bypassCSP: true,
		permissions: ['geolocation'],
	};

	if (options.extraHeaders && Object.keys(options.extraHeaders).length > 0) {
		contextOptions.extraHTTPHeaders = options.extraHeaders;
	}

	const context = await browser.newContext(contextOptions);

	if (options.stealth) {
		await context.addInitScript(STEALTH_INIT_SCRIPT);
	}

	const page = await context.newPage();

	const sessionId = `pw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	const wsEndpoint = browser.version();

	activeSessions.set(sessionId, { browser, context, page });

	const sessionData: SessionData = {
		sessionId,
		wsEndpoint,
		browserType: options.browserType,
		headless: options.headless,
		userAgent: options.userAgent,
		viewportWidth: options.viewportWidth,
		viewportHeight: options.viewportHeight,
		locale: options.locale,
		timezone: options.timezone,
	};

	return { sessionData, page };
}

export function getSession(sessionId: string): BrowserSession | undefined {
	return activeSessions.get(sessionId);
}

export function getPage(sessionId: string): Page {
	const session = activeSessions.get(sessionId);
	if (!session) {
		throw new Error(
			`No active browser session found with ID: ${sessionId}. Please ensure a PlaywrightBrowser "Open" node is connected before this node.`,
		);
	}
	return session.page;
}

export function getContext(sessionId: string): BrowserContext {
	const session = activeSessions.get(sessionId);
	if (!session) {
		throw new Error(`No active browser session found with ID: ${sessionId}.`);
	}
	return session.context;
}

export async function closeBrowser(sessionId: string): Promise<void> {
	const session = activeSessions.get(sessionId);
	if (session) {
		try {
			await session.page.close();
			await session.context.close();
			await session.browser.close();
		} catch (_e) {
			// Browser may already be closed
		}
		activeSessions.delete(sessionId);
	}
}

export async function closeAllBrowsers(): Promise<void> {
	for (const [sessionId] of activeSessions) {
		await closeBrowser(sessionId);
	}
}
