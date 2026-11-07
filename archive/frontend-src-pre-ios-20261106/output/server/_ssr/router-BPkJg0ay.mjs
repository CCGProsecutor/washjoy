import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { i as require_react, n as QueryClientProvider, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { d as HeadContent, g as createRootRoute, h as createFileRoute, m as lazyRouteComponent, p as createRouter, u as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
// node_modules/.nitro/vite/services/ssr/assets/router-BPkJg0ay.js
var router_BPkJg0ay_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/washjoy/assets/styles-Bi--H7Q6.css";
var Route$4 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Washjoy · 附近体验" },
			{
				name: "theme-color",
				content: "#f7faf8"
			},
			{
				name: "description",
				content: "发现附近的洗浴、足疗与私汤体验。"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "manifest",
			href: "/washjoy/manifest.webmanifest"
		}]
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
				children: [children, false]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { dangerouslySetInnerHTML: { __html: `if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/washjoy/sw.js',{scope:'/washjoy/'}).catch(()=>{}));` } }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
var $$splitComponentImporter$3 = () => import("./routes-lvbaBb7l.mjs");
var Route$3 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./account-COXWAewJ.mjs");
var Route$2 = createFileRoute("/account")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./admin-B4s1Mkno.mjs");
var Route$1 = createFileRoute("/admin")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./mine-BRchSI-O.mjs");
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
export { getRouter, router_BPkJg0ay_exports as t };
