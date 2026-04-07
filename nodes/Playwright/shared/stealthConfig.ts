import type { BrowserTypeName } from './types';

export const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const DEFAULT_VIEWPORT_WIDTH = 1920;
export const DEFAULT_VIEWPORT_HEIGHT = 1080;
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_TIMEZONE = 'Europe/Istanbul';
export const DEFAULT_BROWSER_TYPE: BrowserTypeName = 'chromium';

export const STEALTH_INIT_SCRIPT = `
	// Overwrite the 'webdriver' property to return false
	Object.defineProperty(navigator, 'webdriver', {
		get: () => false,
	});

	// Overwrite the 'plugins' property to return a non-empty array
	Object.defineProperty(navigator, 'plugins', {
		get: () => [
			{ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
			{ name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
			{ name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
		],
	});

	// Overwrite the 'languages' property
	Object.defineProperty(navigator, 'languages', {
		get: () => ['en-US', 'en'],
	});

	// Overwrite the 'platform' property
	Object.defineProperty(navigator, 'platform', {
		get: () => 'Win32',
	});

	// Overwrite the 'hardwareConcurrency' property
	Object.defineProperty(navigator, 'hardwareConcurrency', {
		get: () => 8,
	});

	// Overwrite the 'deviceMemory' property
	Object.defineProperty(navigator, 'deviceMemory', {
		get: () => 8,
	});

	// Remove the 'chrome' runtime detection
	window.chrome = {
		runtime: {},
		loadTimes: function() {},
		csi: function() {},
		app: {},
	};

	// Overwrite the 'permissions' query method
	const originalQuery = window.navigator.permissions.query;
	window.navigator.permissions.query = (parameters) =>
		parameters.name === 'notifications'
			? Promise.resolve({ state: Notification.permission })
			: originalQuery(parameters);

	// Prevent iframe detection
	Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
		get: function () {
			return window;
		},
	});

	// WebGL Vendor and Renderer spoofing
	const getParameter = WebGLRenderingContext.prototype.getParameter;
	WebGLRenderingContext.prototype.getParameter = function (parameter) {
		if (parameter === 37445) {
			return 'Intel Inc.';
		}
		if (parameter === 37446) {
			return 'Intel Iris OpenGL Engine';
		}
		return getParameter.call(this, parameter);
	};

	// Prevent canvas fingerprinting
	const toBlob = HTMLCanvasElement.prototype.toBlob;
	const toDataURL = HTMLCanvasElement.prototype.toDataURL;
	const getImageData = CanvasRenderingContext2D.prototype.getImageData;

	HTMLCanvasElement.prototype.toBlob = function (...args) {
		const context = this.getContext('2d');
		if (context) {
			const shift = { r: Math.floor(Math.random() * 10) - 5, g: Math.floor(Math.random() * 10) - 5, b: Math.floor(Math.random() * 10) - 5 };
			const width = this.width;
			const height = this.height;
			const imageData = getImageData.call(context, 0, 0, width, height);
			for (let i = 0; i < imageData.data.length; i += 4) {
				imageData.data[i] += shift.r;
				imageData.data[i + 1] += shift.g;
				imageData.data[i + 2] += shift.b;
			}
			context.putImageData(imageData, 0, 0);
		}
		return toBlob.apply(this, args);
	};

	HTMLCanvasElement.prototype.toDataURL = function (...args) {
		const context = this.getContext('2d');
		if (context) {
			const shift = { r: Math.floor(Math.random() * 10) - 5, g: Math.floor(Math.random() * 10) - 5, b: Math.floor(Math.random() * 10) - 5 };
			const width = this.width;
			const height = this.height;
			const imageData = getImageData.call(context, 0, 0, width, height);
			for (let i = 0; i < imageData.data.length; i += 4) {
				imageData.data[i] += shift.r;
				imageData.data[i + 1] += shift.g;
				imageData.data[i + 2] += shift.b;
			}
			context.putImageData(imageData, 0, 0);
		}
		return toDataURL.apply(this, args);
	};
`;

export const STEALTH_BROWSER_ARGS = [
	'--disable-blink-features=AutomationControlled',
	'--disable-features=IsolateOrigins,site-per-process',
	'--disable-infobars',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--disable-accelerated-2d-canvas',
	'--no-first-run',
	'--no-zygote',
	'--no-sandbox',
	'--disable-gpu',
	'--window-size=1920,1080',
	'--start-maximized',
	'--ignore-certificate-errors',
	'--lang=en-US,en',
];
