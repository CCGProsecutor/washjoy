import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { C as require_react, w as require_jsx_runtime } from "../_libs/@base-ui/react+[...].mjs";
import { d as HeadContent, g as createRootRoute, h as createFileRoute, m as lazyRouteComponent, p as createRouter, u as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { n as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { r as MotionConfig } from "../_libs/framer-motion+[...].mjs";
// node_modules/.nitro/vite/services/ssr/assets/router-CZkWrz9O.js
var router_CZkWrz9O_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Providers({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MotionConfig, {
		reducedMotion: "user",
		children
	});
}
var styles_default = "/washjoy/assets/styles-DYDoF1Rp.css";
var inter_latin_wght_normal_default = "/washjoy/assets/inter-latin-wght-normal-Dx4kXJAl.woff2";
var Route$4 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
			},
			{ title: "Washjoy · 附近体验" },
			{
				name: "theme-color",
				content: "#f2f5f3"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default"
			},
			{
				name: "description",
				content: "发现附近的洗浴、足疗与私汤体验。"
			}
		],
		links: [
			{
				rel: "preload",
				href: inter_latin_wght_normal_default,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/washjoy/manifest.webmanifest"
			}
		]
	}),
	shellComponent: RootDocument
});
function RootDocument({ children }) {
	const [queryClient] = (0, import_react.useState)(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "zh-CN",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
				client: queryClient,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Providers, { children }), false]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { dangerouslySetInnerHTML: { __html: `if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/washjoy/sw.js',{scope:'/washjoy/'}).catch(()=>{}));` } }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
var $$splitComponentImporter$3 = () => import("./routes-tbbn31yR.mjs");
var Route$3 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./account-B0sXNwWI.mjs");
var Route$2 = createFileRoute("/account")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./admin-_d4-EzSD.mjs");
var Route$1 = createFileRoute("/admin")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./mine-_OHrAkHu.mjs");
var Route = createFileRoute("/mine")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var rootRouteChildren = {
	IndexRoute: Route$3.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$4
	}),
	AccountRoute: Route$2.update({
		id: "/account",
		path: "/account",
		getParentRoute: () => Route$4
	}),
	AdminRoute: Route$1.update({
		id: "/admin",
		path: "/admin",
		getParentRoute: () => Route$4
	}),
	MineRoute: Route.update({
		id: "/mine",
		path: "/mine",
		getParentRoute: () => Route$4
	})
};
var routeTree = Route$4._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		basepath: "/washjoy",
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0
	});
}
export { getRouter, router_CZkWrz9O_exports as t };
