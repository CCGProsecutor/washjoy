globalThis.__nitro_main__ = import.meta.url;
import { a as proxyRequest, c as FastResponse, i as defineLazyEventHandler, l as serve, n as HTTPError, o as toEventHandler, r as defineHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { a as withoutBase, i as withQuery, n as joinURL, o as withoutTrailingSlash, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
// node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
var proxy = ((m) => function proxyRouteRule(event) {
	let target = m.options?.to;
	if (!target) return;
	if (target.endsWith("/**")) {
		let targetPath = event.url.pathname + event.url.search;
		const strpBase = m.options._proxyStripBase;
		if (strpBase) {
			if (!isPathInScope(event.url.pathname, strpBase)) throw new HTTPError({ status: 400 });
			targetPath = withoutBase(targetPath, strpBase);
		} else if (targetPath.startsWith("//")) targetPath = targetPath.replace(/^\/+/, "/");
		target = joinURL(target.slice(0, -3), targetPath);
	} else if (event.url.search) target = withQuery(target, Object.fromEntries(event.url.searchParams));
	return proxyRequest(event, target, { ...m.options });
});
function isPathInScope(pathname, base) {
	let canonical;
	try {
		const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
		canonical = new URL(pre, "http://_").pathname;
	} catch {
		return false;
	}
	return !base || canonical === base || canonical.startsWith(base + "/");
}
// #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets-washjoy-icon-192.png": {
		"type": "image/png",
		"etag": "\"4c5d-cW4ocIZy3haiwBfOpBajUXrSWDU\"",
		"mtime": "2026-11-06T03:39:28.037Z",
		"size": 19549,
		"path": "../public/assets-washjoy-icon-192.png"
	},
	"/assets-washjoy-icon-512.png": {
		"type": "image/png",
		"etag": "\"1637f-H5hMjDKnzsSc3+d2eALtMEX4oRQ\"",
		"mtime": "2026-11-06T03:39:28.037Z",
		"size": 91007,
		"path": "../public/assets-washjoy-icon-512.png"
	},
	"/manifest.webmanifest": {
		"type": "application/manifest+json",
		"etag": "\"230-wb6ehi73DkcCIfqGiaR3waAEmWk\"",
		"mtime": "2026-11-06T03:39:28.037Z",
		"size": 560,
		"path": "../public/manifest.webmanifest"
	},
	"/sw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e1-Qm43pUx/c8pOH8DAgIhb9xDJdXc\"",
		"mtime": "2026-11-06T03:39:28.037Z",
		"size": 1249,
		"path": "../public/sw.js"
	},
	"/assets/account-CUuqBlWm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"118d-jD5uHdU9LSOAU0ifJAQKz0kZzo8\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 4493,
		"path": "../public/assets/account-CUuqBlWm.js"
	},
	"/assets/admin-CTHn1bkI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c8b-w/dYPqVgHhqusovhIYl3KyevSR8\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 11403,
		"path": "../public/assets/admin-CTHn1bkI.js"
	},
	"/assets/api-HkjWCZ1W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ce-ongGbhD6u5DtWPVj48nZWGOEp5g\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 5326,
		"path": "../public/assets/api-HkjWCZ1W.js"
	},
	"/assets/dist-BBZY6cUJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1356-ENmJi9PWv3Wur8Oq1+AkBk2kNk0\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 4950,
		"path": "../public/assets/dist-BBZY6cUJ.js"
	},
	"/assets/index-B3VNFVFp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"59684-aefsjjQs+DIOl48C8tIbRSxUFOY\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 366212,
		"path": "../public/assets/index-B3VNFVFp.js"
	},
	"/assets/loader-circle-CMXS8TV4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"149-lyO/24vXMjDXymVFYrXQ7PPdrzo\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 329,
		"path": "../public/assets/loader-circle-CMXS8TV4.js"
	},
	"/assets/mine-B_GGY-03.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f8e-knH3wSDr3Z/BEvxToDx63OpEcIQ\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 3982,
		"path": "../public/assets/mine-B_GGY-03.js"
	},
	"/assets/rolldown-runtime-WkwZ5CU-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"257-wHdrXV3vXbjJUFUsIyMQ+8j0C3c\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 599,
		"path": "../public/assets/rolldown-runtime-WkwZ5CU-.js"
	},
	"/assets/routes-1OhQGcul.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28493-bhXwimLHItyc4Q+c131+V5i+phU\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 165011,
		"path": "../public/assets/routes-1OhQGcul.js"
	},
	"/assets/search-DmOydSQS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c9-ZHuROz42fmEAihkqnUq2/DZIrSM\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 201,
		"path": "../public/assets/search-DmOydSQS.js"
	},
	"/assets/star-QC8Hj_QX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"421-4hU+hNe5/02BLOOoDIrrS3ik2lI\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 1057,
		"path": "../public/assets/star-QC8Hj_QX.js"
	},
	"/assets/styles-Bi--H7Q6.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"8014-yuVAf2oOvmxyzXsVkeFn9oI8e1k\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 32788,
		"path": "../public/assets/styles-Bi--H7Q6.css"
	},
	"/assets/user-round-CGp5om9Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e4-IdrcpTjGc9ypuupcvYXeitaTa/M\"",
		"mtime": "2026-11-06T03:39:26.477Z",
		"size": 228,
		"path": "../public/assets/user-round-CGp5om9Z.js"
	},
	"/assets/washjoy-app-icon-192.png": {
		"type": "image/png",
		"etag": "\"4c5d-cW4ocIZy3haiwBfOpBajUXrSWDU\"",
		"mtime": "2026-11-06T03:39:28.041Z",
		"size": 19549,
		"path": "../public/assets/washjoy-app-icon-192.png"
	},
	"/washjoy/assets/account-CUuqBlWm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"118d-jD5uHdU9LSOAU0ifJAQKz0kZzo8\"",
		"mtime": "2026-11-06T03:39:28.017Z",
		"size": 4493,
		"path": "../public/washjoy/assets/account-CUuqBlWm.js"
	},
	"/washjoy/assets/admin-CTHn1bkI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c8b-w/dYPqVgHhqusovhIYl3KyevSR8\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 11403,
		"path": "../public/washjoy/assets/admin-CTHn1bkI.js"
	},
	"/assets/washjoy-app-icon-512.png": {
		"type": "image/png",
		"etag": "\"1637f-H5hMjDKnzsSc3+d2eALtMEX4oRQ\"",
		"mtime": "2026-11-06T03:39:28.041Z",
		"size": 91007,
		"path": "../public/assets/washjoy-app-icon-512.png"
	},
	"/washjoy/assets/dist-BBZY6cUJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1356-ENmJi9PWv3Wur8Oq1+AkBk2kNk0\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 4950,
		"path": "../public/washjoy/assets/dist-BBZY6cUJ.js"
	},
	"/washjoy/assets/api-HkjWCZ1W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14ce-ongGbhD6u5DtWPVj48nZWGOEp5g\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 5326,
		"path": "../public/washjoy/assets/api-HkjWCZ1W.js"
	},
	"/washjoy/assets/loader-circle-CMXS8TV4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"149-lyO/24vXMjDXymVFYrXQ7PPdrzo\"",
		"mtime": "2026-11-06T03:39:28.017Z",
		"size": 329,
		"path": "../public/washjoy/assets/loader-circle-CMXS8TV4.js"
	},
	"/washjoy/assets/index-B3VNFVFp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"59684-aefsjjQs+DIOl48C8tIbRSxUFOY\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 366212,
		"path": "../public/washjoy/assets/index-B3VNFVFp.js"
	},
	"/washjoy/assets/mine-B_GGY-03.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f8e-knH3wSDr3Z/BEvxToDx63OpEcIQ\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 3982,
		"path": "../public/washjoy/assets/mine-B_GGY-03.js"
	},
	"/washjoy/assets/rolldown-runtime-WkwZ5CU-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"257-wHdrXV3vXbjJUFUsIyMQ+8j0C3c\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 599,
		"path": "../public/washjoy/assets/rolldown-runtime-WkwZ5CU-.js"
	},
	"/washjoy/assets/routes-1OhQGcul.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28493-bhXwimLHItyc4Q+c131+V5i+phU\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 165011,
		"path": "../public/washjoy/assets/routes-1OhQGcul.js"
	},
	"/washjoy/assets/search-DmOydSQS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c9-ZHuROz42fmEAihkqnUq2/DZIrSM\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 201,
		"path": "../public/washjoy/assets/search-DmOydSQS.js"
	},
	"/washjoy/assets/star-QC8Hj_QX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"421-4hU+hNe5/02BLOOoDIrrS3ik2lI\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 1057,
		"path": "../public/washjoy/assets/star-QC8Hj_QX.js"
	},
	"/washjoy/assets/styles-Bi--H7Q6.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"8014-yuVAf2oOvmxyzXsVkeFn9oI8e1k\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 32788,
		"path": "../public/washjoy/assets/styles-Bi--H7Q6.css"
	},
	"/washjoy/assets/user-round-CGp5om9Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e4-IdrcpTjGc9ypuupcvYXeitaTa/M\"",
		"mtime": "2026-11-06T03:39:28.021Z",
		"size": 228,
		"path": "../public/washjoy/assets/user-round-CGp5om9Z.js"
	}
};
// #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
// #nitro/virtual/public-assets
var publicAssetBases = { "/washjoy/": { "maxAge": 0 } };
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
// node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
// #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "proxy",
		route: "/washjoy/api/**",
		handler: proxy,
		options: {
			"to": "http://127.0.0.1:3775/**",
			"_proxyStripBase": "/washjoy/api"
		}
	}], $1 = [{
		name: "proxy",
		route: "/washjoy/account/**",
		handler: proxy,
		options: {
			"to": "http://127.0.0.1:3780/washjoy/",
			"_proxyStripBase": "/washjoy/account"
		}
	}], $2 = [{
		name: "proxy",
		route: "/washjoy/mine/**",
		handler: proxy,
		options: {
			"to": "http://127.0.0.1:3780/washjoy/",
			"_proxyStripBase": "/washjoy/mine"
		}
	}], $3 = [{
		name: "proxy",
		route: "/washjoy/admin/**",
		handler: proxy,
		options: {
			"to": "http://127.0.0.1:3780/washjoy/",
			"_proxyStripBase": "/washjoy/admin"
		}
	}], $4 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/"), l = s.length;
		if (l > 1) {
			if (s[1] === "washjoy") {
				if (l > 2) {
					if (s[2] === "api") r.unshift({
						data: $0,
						params: { "_": s.slice(3).join("/") }
					});
					else if (s[2] === "account") r.unshift({
						data: $1,
						params: { "_": s.slice(3).join("/") }
					});
					else if (s[2] === "mine") r.unshift({
						data: $2,
						params: { "_": s.slice(3).join("/") }
					});
					else if (s[2] === "admin") r.unshift({
						data: $3,
						params: { "_": s.slice(3).join("/") }
					});
				}
			} else if (s[1] === "assets") r.unshift({
				data: $4,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_Byeb2f = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_Byeb2f
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
// node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
// #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
// #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
// node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
// node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
// #nitro/virtual/tracing
var tracingSrvxPlugins = [];
// node_modules/nitro/dist/presets/bun/runtime/bun.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var _fetch = useNitroApp().fetch;
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: _fetch,
	bun: { websocket: void 0 },
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var bun_default = {};
export { bun_default as default };
