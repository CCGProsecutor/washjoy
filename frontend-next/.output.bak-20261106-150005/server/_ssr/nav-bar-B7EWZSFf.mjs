import { i as __toESM } from "../_runtime.mjs";
import { n as appUrl } from "./api-BQyxYK3H.mjs";
import { n as Icon } from "./segmented-BKUUGHfR.mjs";
import { C as require_react, w as require_jsx_runtime } from "../_libs/@base-ui/react+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/nav-bar-B7EWZSFf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
function NavBar({ title, back = true, trailing }) {
	const sentinel = (0, import_react.useRef)(null);
	const [collapsed, setCollapsed] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const el = sentinel.current;
		if (!el || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { rootMargin: `-44px 0px 0px 0px` });
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: `wj-navbar wj-glass${collapsed ? " is-collapsed" : ""}`,
		children: [
			back ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				className: "wj-nav-back wj-subhead",
				href: appUrl(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					icon: import_lucide_react.ChevronLeft,
					size: "lg"
				}), "地图"]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-nav-title wj-headline",
				"aria-hidden": "true",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-nav-trailing",
				children: trailing
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "wj-large-title",
		ref: sentinel,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "wj-title1",
			children: title
		})
	})] });
}
export { NavBar as t };
