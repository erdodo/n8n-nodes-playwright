export interface SessionData {
	sessionId: string;
	wsEndpoint: string;
	browserType: string;
	headless: boolean;
	userAgent: string;
	viewportWidth: number;
	viewportHeight: number;
	locale: string;
	timezone: string;
}

export interface NetworkRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	postData: string | null;
	resourceType: string;
	status: number | null;
	statusText: string | null;
	responseHeaders: Record<string, string>;
	responseBody: string | null;
	timing: {
		startTime: number;
		endTime: number;
		duration: number;
	};
}

export type BrowserTypeName = 'chromium' | 'firefox' | 'webkit';
