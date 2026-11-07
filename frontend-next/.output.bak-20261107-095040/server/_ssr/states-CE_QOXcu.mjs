import { n as Icon, t as Button$1 } from "./segmented-BKUUGHfR.mjs";
import { w as require_jsx_runtime } from "../_libs/@base-ui/react+[...].mjs";
import { t as motion } from "../_libs/motion.mjs";
import { t as useReducedMotion } from "../_libs/framer-motion+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/states-CE_QOXcu.js
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
function distanceInKm(lat1, lon1, lat2, lon2) {
	const radians = (value) => value * Math.PI / 180;
	const dLat = radians(lat2 - lat1);
	const dLon = radians(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
	return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatDistance(km) {
	if (km == null || !Number.isFinite(km)) return "";
	if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
	return `${km.toFixed(1)} km`;
}
function PlaceRow({ place, index, distance, onOpen }) {
	const reduced = useReducedMotion();
	const meta = [place.category, formatDistance(distance)].filter(Boolean).join(" · ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
		type: "button",
		className: "wj-row",
		onClick: () => onOpen(place),
		initial: reduced ? false : {
			opacity: 0,
			y: 8
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: {
			duration: .28,
			delay: reduced ? 0 : Math.min(index * .02, .12),
			ease: [
				.32,
				.72,
				0,
				1
			]
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "wj-row-thumb",
			children: [place.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: place.image,
				alt: "",
				loading: "lazy",
				decoding: "async"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-row-fallback",
				children: place.category.slice(0, 2)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-row-index wj-caption",
				children: index + 1
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "wj-row-body",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "wj-headline wj-clamp-2",
					children: place.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "wj-footnote wj-secondary wj-clamp-1",
					children: place.address || place.category
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "wj-footnote wj-row-meta",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "wj-rating",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							icon: import_lucide_react.Star,
							size: "sm",
							fill: true
						}), place.score?.toFixed(1) ?? "新店"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "wj-secondary",
						children: meta
					})]
				})
			]
		})]
	});
}
function SkeletonRows({ count = 4 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "wj-skeletons",
		"aria-busy": "true",
		"aria-label": "正在加载",
		children: Array.from({ length: count }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "wj-skeleton-row",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wj-skeleton wj-skeleton-thumb" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "wj-skeleton" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "wj-skeleton" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "wj-skeleton" })
			] })]
		}, index))
	});
}
function EmptyState({ icon, title, hint, actions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "wj-empty",
		role: "status",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-empty-icon",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					icon,
					size: "lg"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "wj-headline",
				children: title
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "wj-footnote wj-secondary",
				children: hint
			}),
			actions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "wj-empty-actions",
				children: actions
			})
		]
	});
}
function ErrorState({ title, hint, onRetry }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "wj-empty",
		role: "alert",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "wj-headline",
				children: title
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "wj-footnote wj-secondary",
				children: hint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "wj-empty-actions",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button$1, {
					variant: "secondary",
					onClick: onRetry,
					children: "重试"
				})
			})
		]
	});
}
export { distanceInKm as a, SkeletonRows as i, ErrorState as n, formatDistance as o, PlaceRow as r, EmptyState as t };
