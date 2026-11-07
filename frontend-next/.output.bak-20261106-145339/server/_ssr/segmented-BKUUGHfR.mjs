import { n as appUrl } from "./api-BQyxYK3H.mjs";
import { S as Button, b as ToggleGroup, w as require_jsx_runtime, x as Toggle } from "../_libs/@base-ui/react+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/segmented-BKUUGHfR.js
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
var sizes = {
	sm: 14,
	md: 18,
	lg: 22
};
function Icon({ icon: Glyph, size = "md", fill, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glyph, {
		"aria-hidden": "true",
		width: sizes[size],
		height: sizes[size],
		strokeWidth: 1.75,
		fill: fill ? "currentColor" : "none",
		className
	});
}
var tabs = [
	{
		id: "nearby",
		label: "附近",
		href: () => appUrl(),
		icon: import_lucide_react.MapPin
	},
	{
		id: "saved",
		label: "收藏",
		href: () => appUrl("mine/"),
		icon: import_lucide_react.Heart
	},
	{
		id: "me",
		label: "我的",
		href: () => appUrl("account/"),
		icon: import_lucide_react.UserRound
	}
];
function TabBar({ active }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "wj-tabbar wj-glass",
		"aria-label": "主导航",
		children: tabs.map(({ id, label, href, icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			href: href(),
			className: "wj-tab",
			"aria-current": active === id ? "page" : void 0,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon,
				size: "lg"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-caption",
				children: label
			})]
		}, id))
	});
}
function Button$1({ variant = "secondary", iconOnly, loading, className = "", disabled, children, ...rest }) {
	const cls = `wj-btn wj-btn-${variant}${iconOnly ? " wj-btn-icon" : ""}${className ? ` ${className}` : ""}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		className: cls,
		disabled: disabled || loading,
		focusableWhenDisabled: Boolean(loading),
		...rest,
		children: [loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			icon: import_lucide_react.LoaderCircle,
			size: "sm",
			className: "wj-spin"
		}), children]
	});
}
function Segmented({ value, onChange, options, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroup, {
		className: "wj-segmented",
		"aria-label": label,
		value: [value],
		onValueChange: (next) => {
			const picked = next[0];
			if (picked) onChange(picked);
		},
		children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Toggle, {
			value: option.value,
			className: "wj-segment",
			children: [option.icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon: option.icon,
				size: "sm"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: option.label })]
		}, option.value))
	});
}
export { TabBar as i, Icon as n, Segmented as r, Button$1 as t };
