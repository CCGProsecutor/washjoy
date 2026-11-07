import { i as __toESM } from "../_runtime.mjs";
import { i as getSession, o as savedPlacesKey, r as getPlaces, t as api } from "./api-DyeFQMCW.mjs";
import { i as require_react, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/mine-BRchSI-O.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
function Mine() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("saved");
	const [savedIds, setSavedIds] = (0, import_react.useState)([]);
	const [places, setPlaces] = (0, import_react.useState)([]);
	const [reviews, setReviews] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let active = true;
		getSession().then(async (session) => {
			if (!active) return;
			setUser(session);
			if (!session) {
				setLoading(false);
				return;
			}
			try {
				const ids = JSON.parse(localStorage.getItem(savedPlacesKey(session)) || "[]");
				const [allPlaces, myReviews] = await Promise.all([getPlaces(), api("reviews/mine")]);
				if (active) {
					setSavedIds(ids);
					setPlaces(allPlaces.filter((place) => ids.includes(place.id)));
					setReviews(myReviews.reviews || []);
				}
			} catch {
				if (active) setSavedIds([]);
			} finally {
				if (active) setLoading(false);
			}
		});
		return () => {
			active = false;
		};
	}, []);
	function unsave(place) {
		if (!user) return;
		const next = savedIds.filter((id) => id !== place.id);
		setSavedIds(next);
		setPlaces(places.filter((item) => item.id !== place.id));
		localStorage.setItem(savedPlacesKey(user), JSON.stringify(next));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "simple-page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/washjoy/",
					"aria-label": "返回地图",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowLeft, { size: 17 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "我的" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/washjoy/account/",
					"aria-label": "账户",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.UserRound, { size: 18 })
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "profile-block",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "profile-avatar",
						children: user?.profile?.displayName?.slice(0, 1) || "游"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: user?.profile?.displayName || (user ? "Washjoy 用户" : "游客") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: user?.phone || "登录以同步账户状态" })] }),
					user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/washjoy/account/",
						children: "账户"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/washjoy/account/",
						children: "登录"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "mine-tabs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "saved" ? "active" : "",
					onClick: () => setTab("saved"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heart, { size: 15 }),
						"收藏 ",
						user && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: places.length })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: tab === "reviews" ? "active" : "",
					onClick: () => setTab("reviews"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MessageSquareText, { size: 15 }),
						"评价 ",
						user && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: reviews.length })
					]
				})]
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mine-loading",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LoaderCircle, { size: 18 }), "正在加载"]
			}) : !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mine-empty",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.UserRound, { size: 24 }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "登录后查看你的收藏和评价" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/washjoy/account/",
						children: "登录或注册"
					})
				]
			}) : tab === "saved" ? places.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mine-place-list",
				children: places.map((place) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "mine-place",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: `/washjoy/?place=${encodeURIComponent(place.id)}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mine-place-thumb",
							children: place.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: place.image,
								alt: ""
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPinFallback, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: place.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							place.category,
							" · ",
							place.address
						] })] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						"aria-label": `取消收藏 ${place.name}`,
						onClick: () => unsave(place),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heart, {
							size: 17,
							fill: "currentColor"
						})
					})]
				}, place.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mine-empty",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heart, { size: 24 }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "还没有收藏门店" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/washjoy/",
						children: "去附近看看"
					})
				]
			}) : reviews.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mine-review-list",
				children: reviews.map((review) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "mine-review",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: `/washjoy/?place=${encodeURIComponent(review.placeId)}`,
							children: review.placeName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: Array.from({ length: 5 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Star, {
							size: 13,
							fill: index < review.rating ? "currentColor" : "none"
						}, index)) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: review.text }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: (/* @__PURE__ */ new Date(review.created * 1e3)).toLocaleDateString("zh-CN") })
					]
				}, review.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mine-empty",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MessageSquareText, { size: 24 }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "还没有发布评价" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/washjoy/",
						children: "去附近看看"
					})
				]
			})
		]
	});
}
function MapPinFallback() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "mine-thumb-fallback",
		children: "Washjoy"
	});
}
export { Mine as component };
