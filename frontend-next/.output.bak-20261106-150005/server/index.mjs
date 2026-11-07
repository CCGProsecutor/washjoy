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
		"mtime": "2026-11-06T06:59:15.288Z",
		"size": 19549,
		"path": "../public/assets-washjoy-icon-192.png"
	},
	"/assets-washjoy-icon-512.png": {
		"type": "image/png",
		"etag": "\"1637f-H5hMjDKnzsSc3+d2eALtMEX4oRQ\"",
		"mtime": "2026-11-06T06:59:15.288Z",
		"size": 91007,
		"path": "../public/assets-washjoy-icon-512.png"
	},
	"/manifest.webmanifest": {
		"type": "application/manifest+json",
		"etag": "\"230-wb6ehi73DkcCIfqGiaR3waAEmWk\"",
		"mtime": "2026-11-06T06:59:15.288Z",
		"size": 560,
		"path": "../public/manifest.webmanifest"
	},
	"/sw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e1-Qm43pUx/c8pOH8DAgIhb9xDJdXc\"",
		"mtime": "2026-11-06T06:59:15.288Z",
		"size": 1249,
		"path": "../public/sw.js"
	},
	"/assets/account-BBooJDKa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1894-Z46HfZl8UVUgD/UnK8FvxO3Z8zY\"",
		"mtime": "2026-11-06T06:59:12.524Z",
		"size": 6292,
		"path": "../public/assets/account-BBooJDKa.js"
	},
	"/assets/admin-DeLArt9E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c5d-DZP7QtPl3uUpJdl2lNx46LGheIo\"",
		"mtime": "2026-11-06T06:59:12.524Z",
		"size": 11357,
		"path": "../public/assets/admin-DeLArt9E.js"
	},
	"/assets/api-B78mVuYG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15be-IiCuWsgnm1HPUEysxiYwUJfL0K8\"",
		"mtime": "2026-11-06T06:59:12.524Z",
		"size": 5566,
		"path": "../public/assets/api-B78mVuYG.js"
	},
	"/assets/chevron-right-B1HLxHo0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9d-Weyie+tDzYydMO+ZD8d+yCk9ujo\"",
		"mtime": "2026-11-06T06:59:12.524Z",
		"size": 157,
		"path": "../public/assets/chevron-right-B1HLxHo0.js"
	},
	"/assets/dist-BBZY6cUJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1356-ENmJi9PWv3Wur8Oq1+AkBk2kNk0\"",
		"mtime": "2026-11-06T06:59:12.524Z",
		"size": 4950,
		"path": "../public/assets/dist-BBZY6cUJ.js"
	},
	"/assets/inter-latin-wght-normal-Dx4kXJAl.woff2": {
		"type": "font/woff2",
		"etag": "\"bc80-8R1ym7Ck2DUNLqPQ/AYs9u8tUpg\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 48256,
		"path": "../public/assets/inter-latin-wght-normal-Dx4kXJAl.woff2"
	},
	"/assets/jsx-runtime-CkXRJ162.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2033-Z85fXP8ul6LwQru7ju7qGxFFve8\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 8243,
		"path": "../public/assets/jsx-runtime-CkXRJ162.js"
	},
	"/assets/mine-7KX3ucFO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d3a-E57eljU3j71vVxKodZSn7si0gzI\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 3386,
		"path": "../public/assets/mine-7KX3ucFO.js"
	},
	"/assets/nav-bar-CVRdUDFy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"48d-aNgST28GFp+46aLq7BjWAPKSr0g\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 1165,
		"path": "../public/assets/nav-bar-CVRdUDFy.js"
	},
	"/assets/phone-B5xIoky7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15d-SZQDlDudpM4NtGrvHZG4MUbkI/U\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 349,
		"path": "../public/assets/phone-B5xIoky7.js"
	},
	"/assets/rolldown-runtime-WkwZ5CU-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"257-wHdrXV3vXbjJUFUsIyMQ+8j0C3c\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 599,
		"path": "../public/assets/rolldown-runtime-WkwZ5CU-.js"
	},
	"/assets/index-CBaKZavN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"57b1f-ZqYCENiq6KmcTZJXEIhHcdmDz50\"",
		"mtime": "2026-11-06T06:59:12.524Z",
		"size": 359199,
		"path": "../public/assets/index-CBaKZavN.js"
	},
	"/assets/search-qVrzow2n.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"129-T7/nxtaVbT38joP6GP2GehjnMSY\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 297,
		"path": "../public/assets/search-qVrzow2n.js"
	},
	"/assets/segmented-BTRKisRV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"66f7-5FdxG4iAzRrYhdoNnb+I5lp0zvM\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 26359,
		"path": "../public/assets/segmented-BTRKisRV.js"
	},
	"/assets/routes-CAXRdJiv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e26d-yoAVbHrf616dm+oxZ0awTMjr1NQ\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 189037,
		"path": "../public/assets/routes-CAXRdJiv.js"
	},
	"/assets/styles-BVOQorDn.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"f7f2-n0lzAO5vd0IJAzcovqLvuTBW3m0\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 63474,
		"path": "../public/assets/styles-BVOQorDn.css"
	},
	"/assets/washjoy-app-icon-192.png": {
		"type": "image/png",
		"etag": "\"4c5d-cW4ocIZy3haiwBfOpBajUXrSWDU\"",
		"mtime": "2026-11-06T06:59:15.288Z",
		"size": 19549,
		"path": "../public/assets/washjoy-app-icon-192.png"
	},
	"/assets/states-DqDat0-M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20d41-1eGHgP5NOAXUownmVTdXTf/vFV4\"",
		"mtime": "2026-11-06T06:59:12.528Z",
		"size": 134465,
		"path": "../public/assets/states-DqDat0-M.js"
	},
	"/washjoy/assets/account-BBooJDKa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1894-Z46HfZl8UVUgD/UnK8FvxO3Z8zY\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 6292,
		"path": "../public/washjoy/assets/account-BBooJDKa.js"
	},
	"/assets/washjoy-app-icon-512.png": {
		"type": "image/png",
		"etag": "\"1637f-H5hMjDKnzsSc3+d2eALtMEX4oRQ\"",
		"mtime": "2026-11-06T06:59:15.288Z",
		"size": 91007,
		"path": "../public/assets/washjoy-app-icon-512.png"
	},
	"/washjoy/assets/admin-DeLArt9E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c5d-DZP7QtPl3uUpJdl2lNx46LGheIo\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 11357,
		"path": "../public/washjoy/assets/admin-DeLArt9E.js"
	},
	"/washjoy/assets/api-B78mVuYG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15be-IiCuWsgnm1HPUEysxiYwUJfL0K8\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 5566,
		"path": "../public/washjoy/assets/api-B78mVuYG.js"
	},
	"/washjoy/assets/chevron-right-B1HLxHo0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9d-Weyie+tDzYydMO+ZD8d+yCk9ujo\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 157,
		"path": "../public/washjoy/assets/chevron-right-B1HLxHo0.js"
	},
	"/washjoy/assets/dist-BBZY6cUJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1356-ENmJi9PWv3Wur8Oq1+AkBk2kNk0\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 4950,
		"path": "../public/washjoy/assets/dist-BBZY6cUJ.js"
	},
	"/washjoy/assets/inter-latin-wght-normal-Dx4kXJAl.woff2": {
		"type": "font/woff2",
		"etag": "\"bc80-8R1ym7Ck2DUNLqPQ/AYs9u8tUpg\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 48256,
		"path": "../public/washjoy/assets/inter-latin-wght-normal-Dx4kXJAl.woff2"
	},
	"/washjoy/assets/jsx-runtime-CkXRJ162.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2033-Z85fXP8ul6LwQru7ju7qGxFFve8\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 8243,
		"path": "../public/washjoy/assets/jsx-runtime-CkXRJ162.js"
	},
	"/washjoy/assets/mine-7KX3ucFO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d3a-E57eljU3j71vVxKodZSn7si0gzI\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 3386,
		"path": "../public/washjoy/assets/mine-7KX3ucFO.js"
	},
	"/washjoy/assets/nav-bar-CVRdUDFy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"48d-aNgST28GFp+46aLq7BjWAPKSr0g\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 1165,
		"path": "../public/washjoy/assets/nav-bar-CVRdUDFy.js"
	},
	"/washjoy/assets/phone-B5xIoky7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15d-SZQDlDudpM4NtGrvHZG4MUbkI/U\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 349,
		"path": "../public/washjoy/assets/phone-B5xIoky7.js"
	},
	"/washjoy/assets/index-CBaKZavN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"57b1f-ZqYCENiq6KmcTZJXEIhHcdmDz50\"",
		"mtime": "2026-11-06T06:59:15.240Z",
		"size": 359199,
		"path": "../public/washjoy/assets/index-CBaKZavN.js"
	},
	"/washjoy/assets/rolldown-runtime-WkwZ5CU-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"257-wHdrXV3vXbjJUFUsIyMQ+8j0C3c\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 599,
		"path": "../public/washjoy/assets/rolldown-runtime-WkwZ5CU-.js"
	},
	"/washjoy/assets/search-qVrzow2n.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"129-T7/nxtaVbT38joP6GP2GehjnMSY\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 297,
		"path": "../public/washjoy/assets/search-qVrzow2n.js"
	},
	"/washjoy/assets/segmented-BTRKisRV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"66f7-5FdxG4iAzRrYhdoNnb+I5lp0zvM\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 26359,
		"path": "../public/washjoy/assets/segmented-BTRKisRV.js"
	},
	"/washjoy/assets/states-DqDat0-M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20d41-1eGHgP5NOAXUownmVTdXTf/vFV4\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 134465,
		"path": "../public/washjoy/assets/states-DqDat0-M.js"
	},
	"/washjoy/assets/styles-BVOQorDn.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"f7f2-n0lzAO5vd0IJAzcovqLvuTBW3m0\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 63474,
		"path": "../public/washjoy/assets/styles-BVOQorDn.css"
	},
	"/washjoy/assets/routes-CAXRdJiv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e26d-yoAVbHrf616dm+oxZ0awTMjr1NQ\"",
		"mtime": "2026-11-06T06:59:15.248Z",
		"size": 189037,
		"path": "../public/washjoy/assets/routes-CAXRdJiv.js"
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
