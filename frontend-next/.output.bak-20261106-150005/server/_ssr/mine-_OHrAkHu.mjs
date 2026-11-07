import { i as __toESM } from "../_runtime.mjs";
import { t as NavBar } from "./nav-bar-B7EWZSFf.mjs";
import { i as SkeletonRows, n as ErrorState, r as PlaceRow, t as EmptyState } from "./states-CE_QOXcu.mjs";
import { i as TabBar, n as Icon, r as Segmented, t as Button$1 } from "./segmented-BKUUGHfR.mjs";
import { a as getSession, i as getPlaces, n as appUrl, s as savedPlacesKey, t as api } from "./api-BQyxYK3H.mjs";
import { C as require_react, w as require_jsx_runtime } from "../_libs/@base-ui/react+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/mine-_OHrAkHu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
var openPlace = (id) => window.location.assign(`${appUrl()}?place=${encodeURIComponent(id)}`);
function Mine() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("saved");
	const [savedIds, setSavedIds] = (0, import_react.useState)([]);
	const [places, setPlaces] = (0, import_react.useState)([]);
	const [reviews, setReviews] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [failed, setFailed] = (0, import_react.useState)(false);
	const [attempt, setAttempt] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (new URLSearchParams(window.location.search).get("tab") === "reviews") setTab("reviews");
	}, []);
	(0, import_react.useEffect)(() => {
		let active = true;
		setLoading(true);
		setFailed(false);
		getSession().then(async (session) => {
			if (!active) return;
			setUser(session);
			if (!session) {
				setLoading(false);
				return;
			}
			try {
				const ids = JSON.parse(localStorage.getItem(savedPlacesKey(session)) || "[]");
				const [allPlaces, mine] = await Promise.all([getPlaces(), api("reviews/mine")]);
				if (active) {
					setSavedIds(ids);
					setPlaces(allPlaces.filter((place) => ids.includes(place.id)));
					setReviews(mine.reviews || []);
				}
			} catch {
				if (active) setFailed(true);
			} finally {
				if (active) setLoading(false);
			}
		});
		return () => {
			active = false;
		};
	}, [attempt]);
	function unsave(place) {
		if (!user) return;
		const next = savedIds.filter((id) => id !== place.id);
		setSavedIds(next);
		setPlaces((current) => current.filter((item) => item.id !== place.id));
		localStorage.setItem(savedPlacesKey(user), JSON.stringify(next));
	}
	const signIn = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		className: "wj-btn wj-btn-primary",
		href: appUrl("account/"),
		children: "登录或注册"
	});
	const toMap = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		className: "wj-btn wj-btn-secondary",
		href: appUrl(),
		children: "去附近看看"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "wj-app wj-page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavBar, { title: "收藏" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "wj-page-inner",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
					label: "收藏或评价",
					value: tab,
					onChange: setTab,
					options: [{
						value: "saved",
						label: `收藏${user ? ` ${places.length}` : ""}`,
						icon: import_lucide_react.Heart
					}, {
						value: "reviews",
						label: `评价${user ? ` ${reviews.length}` : ""}`,
						icon: import_lucide_react.MessageSquareText
					}]
				})
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, { count: 3 }) : failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
				title: "暂时加载不了",
				hint: "请检查网络后重试",
				onRetry: () => setAttempt((count) => count + 1)
			}) : !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				icon: import_lucide_react.UserRound,
				title: "登录后查看你的收藏和评价",
				hint: "收藏的门店会同步到你的账户",
				actions: signIn
			}) : tab === "saved" ? places.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				icon: import_lucide_react.Heart,
				title: "还没有收藏门店",
				hint: "在门店详情里点“收藏”就会出现在这里",
				actions: toMap
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "wj-page-inner",
				children: places.map((place, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "wj-saved",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaceRow, {
						place,
						index,
						distance: null,
						onOpen: (item) => openPlace(item.id)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button$1, {
						variant: "plain",
						iconOnly: true,
						className: "wj-saved-remove",
						"aria-label": `取消收藏 ${place.name}`,
						onClick: () => unsave(place),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							icon: import_lucide_react.Heart,
							size: "md",
							fill: true
						})
					})]
				}, place.id))
			}) : reviews.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				icon: import_lucide_react.MessageSquareText,
				title: "还没有发布评价",
				hint: "去门店详情里分享一次体验",
				actions: toMap
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "wj-page-inner",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "wj-group-body",
					children: reviews.map((review) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "wj-review-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "wj-headline",
								href: `${appUrl()}?place=${encodeURIComponent(review.placeId)}`,
								children: review.placeName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
								className: "wj-footnote wj-secondary",
								children: (/* @__PURE__ */ new Date(review.created * 1e3)).toLocaleDateString("zh-CN")
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "wj-rating wj-footnote",
								"aria-label": `${review.rating} 星`,
								children: Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									icon: import_lucide_react.Star,
									size: "sm",
									fill: i < review.rating
								}, i))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "wj-subhead",
								children: review.text
							})
						]
					}, review.id))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBar, { active: "saved" })
		]
	});
}
export { Mine as component };
