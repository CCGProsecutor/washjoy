import { i as __toESM } from "../_runtime.mjs";
import { a as getSession, i as getPlaces, n as appUrl, o as placeCategories, r as formatPrice, s as savedPlacesKey, t as api } from "./api-BQyxYK3H.mjs";
import { a as distanceInKm, i as SkeletonRows, n as ErrorState, o as formatDistance, r as PlaceRow, t as EmptyState } from "./states-CE_QOXcu.mjs";
import { i as TabBar, n as Icon, r as Segmented, t as Button$1 } from "./segmented-BKUUGHfR.mjs";
import { C as require_react, _ as DrawerClose, a as MenuRadioItem, b as ToggleGroup, c as MenuPortal, d as DrawerTitle, f as DrawerRoot, g as DrawerContent, i as MenuRadioItemIndicator, l as MenuPopup, m as DrawerPopup, n as MenuTrigger, o as MenuRadioGroup, p as DrawerPortal, r as MenuRoot, s as MenuPositioner, t as Input, u as DrawerViewport, v as DrawerBackdrop, w as require_jsx_runtime, x as Toggle } from "../_libs/@base-ui/react+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as useReducedMotion } from "../_libs/framer-motion+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/routes-tbbn31yR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
var cityDatasets = [
	{
		id: "nanjing",
		name: "南京市",
		center: [118.7969, 32.0603]
	},
	{
		id: "yangzhou",
		name: "扬州市",
		center: [119.4129, 32.3942]
	},
	{
		id: "taizhou",
		name: "泰州市",
		center: [120.0155, 32.2683]
	},
	{
		id: "zhenjiang",
		name: "镇江市",
		center: [119.4525, 32.2044]
	},
	{
		id: "changzhou",
		name: "常州市",
		center: [119.9965, 31.7683]
	},
	{
		id: "wuxi",
		name: "无锡市",
		center: [120.3057, 31.5683]
	},
	{
		id: "suzhou",
		name: "苏州市",
		center: [120.5954, 31.2989]
	},
	{
		id: "kunshan",
		name: "昆山市",
		center: [120.9645, 31.3939]
	},
	{
		id: "shanghai",
		name: "上海市",
		center: [121.4737, 31.2304]
	},
	{
		id: "nantong",
		name: "南通市",
		center: [120.8955, 32]
	},
	{
		id: "xuzhou",
		name: "徐州市",
		center: [117.1205, 34.2658]
	},
	{
		id: "lianyungang",
		name: "连云港市",
		center: [119.1765, 34.5997]
	},
	{
		id: "suqian",
		name: "宿迁市",
		center: [118.2965, 33.9598]
	},
	{
		id: "huaian",
		name: "淮安市",
		center: [119.0204, 32.6447]
	}
];
var sdkPromise = null;
function loadAMap() {
	const key = "975e5db7d38aab17e5a24b8ee81691ab";
	const securityCode = "d6a1b9a1faaecaf255969b7339b651f6";
	if (!sdkPromise) {
		window._AMapSecurityConfig = { securityJsCode: securityCode };
		sdkPromise = import("../_libs/amap__amap-jsapi-loader.mjs").then((n) => /* @__PURE__ */ __toESM(n.t())).then(({ default: loader }) => loader.load({
			key,
			version: "2.0",
			plugins: [
				"AMap.Scale",
				"AMap.Geolocation",
				"AMap.CitySearch",
				"AMap.Driving",
				"AMap.PlaceSearch"
			]
		})).catch((error) => {
			sdkPromise = null;
			throw error;
		});
	}
	return sdkPromise;
}
function cityOf(result) {
	const component = result?.addressComponent;
	const city = component?.city;
	return (Array.isArray(city) ? city[0] : city) || component?.province || result?.city || "";
}
async function locate() {
	const sdk = await loadAMap();
	try {
		return await new Promise((resolve, reject) => {
			new sdk.Geolocation({
				enableHighAccuracy: false,
				timeout: 1e4,
				maximumAge: 6e4,
				convert: true,
				needAddress: true,
				extensions: "base"
			}).getCurrentPosition((status, result) => {
				if (status !== "complete" || !result?.position) {
					reject(new Error(result?.message || result?.info || "geolocation-failed"));
					return;
				}
				resolve({
					latitude: result.position.lat,
					longitude: result.position.lng,
					city: cityOf(result) || "",
					precise: result.location_type !== "ip" && !/ip/i.test(String(result.location_type || ""))
				});
			});
		});
	} catch (geoError) {
		return new Promise((resolve, reject) => {
			new sdk.CitySearch().getLocalCity((status, result) => {
				if (status !== "complete" || !result?.city || !result?.bounds) {
					reject(geoError);
					return;
				}
				const center = result.bounds.getCenter();
				resolve({
					latitude: center.lat,
					longitude: center.lng,
					city: String(result.city),
					precise: false
				});
			});
		});
	}
}
async function getDrivingDuration(origin, destination) {
	try {
		const sdk = await loadAMap();
		return await new Promise((resolve) => {
			new sdk.Driving().search(new sdk.LngLat(origin[0], origin[1]), new sdk.LngLat(destination[0], destination[1]), (status, result) => {
				if (status === "complete" && result?.routes && result.routes.length > 0) resolve(result.routes[0].duration ?? null);
				else resolve(null);
			});
		});
	} catch {
		return null;
	}
}
async function getPoiReviews(keywords, city) {
	try {
		const sdk = await loadAMap();
		return await new Promise((resolve) => {
			new sdk.PlaceSearch({
				city,
				pageSize: 1
			}).search(keywords, (status, result) => {
				if (status === "complete" && result?.poiList && result.poiList.length > 0) {
					const poi = result.poiList[0];
					const rating = poi?.biz_info?.overall_rating || poi?.rating || 0;
					const ratingCount = poi?.biz_info?.comment_count || 0;
					resolve({
						rating: Number(rating) || 0,
						ratingCount: Number(ratingCount) || 0,
						averageRating: Number(rating) || 0
					});
				} else resolve(null);
			});
		});
	} catch {
		return null;
	}
}
var radiusSteps = [
	3,
	5,
	10,
	0
];
var radiusLabel = (km) => km === 0 ? "全城" : `${km} 公里`;
var durationSteps = [
	900,
	1800,
	2700,
	3600
];
function useNearby() {
	const [fix, setFix] = (0, import_react.useState)(null);
	const [locationState, setLocationState] = (0, import_react.useState)("pending");
	const [locating, setLocating] = (0, import_react.useState)(false);
	const [locationMessage, setLocationMessage] = (0, import_react.useState)("");
	const [radiusIndex, setRadiusIndex] = (0, import_react.useState)(0);
	const [durationIndex, setDurationIndex] = (0, import_react.useState)(-1);
	const [query, setQuery] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("全部");
	const [recommended, setRecommended] = (0, import_react.useState)(false);
	const [limit, setLimit] = (0, import_react.useState)(50);
	const [durations, setDurations] = (0, import_react.useState)(/* @__PURE__ */ new Map());
	const matchedCity = fix?.city ? cityDatasets.find((item) => fix.city.startsWith(item.name.replace("市", ""))) : void 0;
	const dataset = matchedCity ?? cityDatasets[0];
	const outsideCoverage = Boolean(fix?.city) && !matchedCity;
	const userLocation = fix && fix.precise && !outsideCoverage ? fix : null;
	const radiusKm = userLocation ? radiusSteps[radiusIndex] : 0;
	const { data = [], isPending, isError, refetch } = useQuery({
		queryKey: ["places", dataset.id],
		queryFn: () => getPlaces(dataset.id),
		staleTime: 6e4,
		retry: 1
	});
	const locateUser = (0, import_react.useCallback)(() => {
		setLocating(true);
		setLocationState("pending");
		setLocationMessage("");
		locate().then((result) => {
			setFix(result);
			setLocationState("ready");
			setRadiusIndex(0);
			setLimit(50);
		}).catch((error) => {
			const text = error instanceof Error ? error.message : "";
			setLocationState("failed");
			setLocationMessage(/denied|permission/i.test(text) ? "请允许浏览器定位权限" : /timeout/i.test(text) ? "定位超时，请重试" : "暂时无法定位，可点定位按钮重试");
		}).finally(() => setLocating(false));
	}, []);
	(0, import_react.useEffect)(() => {
		locateUser();
	}, [locateUser]);
	(0, import_react.useEffect)(() => {
		setLimit(50);
	}, [
		query,
		category,
		recommended,
		radiusIndex,
		durationIndex,
		dataset.id
	]);
	const results = (0, import_react.useMemo)(() => {
		const needle = query.trim().toLowerCase();
		const maxDuration = durationIndex >= 0 ? durationSteps[durationIndex] : Infinity;
		return data.filter((place) => {
			return `${place.name} ${place.address} ${place.category}`.toLowerCase().includes(needle) && (category === "全部" || place.category === category) && (!recommended || place.recommended);
		}).map((place) => ({
			place,
			distance: userLocation && place.latitude && place.longitude ? distanceInKm(userLocation.latitude, userLocation.longitude, place.latitude, place.longitude) : null
		})).filter(({ distance }) => !userLocation || radiusKm === 0 || distance !== null && distance <= radiusKm).filter(({ place }) => {
			if (durationIndex < 0 || !userLocation || !place.latitude || !place.longitude) return true;
			const duration = durations.get(place.id) ?? null;
			return duration !== null && duration <= maxDuration;
		}).sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE));
	}, [
		category,
		data,
		query,
		recommended,
		userLocation,
		radiusKm,
		durationIndex,
		durations
	]);
	(0, import_react.useEffect)(() => {
		if (durationIndex < 0 || !userLocation) return;
		let cancelled = false;
		const computeDurations = async () => {
			const newDurations = new Map(durations);
			const toCompute = results.slice(0, limit).filter(({ place }) => place.latitude && place.longitude && !newDurations.has(place.id));
			for (const { place } of toCompute) {
				if (cancelled) break;
				const duration = await getDrivingDuration([userLocation.longitude, userLocation.latitude], [place.longitude, place.latitude]);
				if (!cancelled) {
					newDurations.set(place.id, duration ?? Infinity);
					setDurations(new Map(newDurations));
				}
			}
		};
		computeDurations();
		return () => {
			cancelled = true;
		};
	}, [
		durationIndex,
		userLocation,
		results,
		limit,
		durations
	]);
	const status = locating ? "正在获取位置…" : locationState === "failed" ? locationMessage : outsideCoverage ? `${fix?.city}暂无数据，显示${dataset.name}` : userLocation ? `${radiusLabel(radiusKm)}内 · 已定位` : locationState === "ready" ? "大致位置，点定位按钮重试" : `${dataset.name}默认视野`;
	return {
		fix,
		userLocation,
		dataset,
		outsideCoverage,
		radiusKm,
		radiusIndex,
		setRadiusIndex,
		durationIndex,
		setDurationIndex,
		query,
		setQuery,
		category,
		setCategory,
		recommended,
		setRecommended,
		limit,
		setLimit,
		results,
		visible: results.slice(0, limit),
		allPlaces: data,
		isPending,
		isError,
		refetch,
		locating,
		locationState,
		status,
		locateUser
	};
}
function RadiusMenu({ index, onChange, container }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuRoot, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuTrigger, {
		className: "wj-btn wj-btn-secondary wj-menu-trigger",
		"aria-label": "搜索范围",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon: import_lucide_react.Ruler,
				size: "sm"
			}),
			radiusLabel(radiusSteps[index]),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon: import_lucide_react.ChevronDown,
				size: "sm"
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuPortal, {
		container,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuPositioner, {
			sideOffset: 8,
			align: "start",
			className: "wj-menu-positioner",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuPopup, {
				className: "wj-menu wj-glass",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRadioGroup, {
					value: String(index),
					onValueChange: (next) => onChange(Number(next)),
					children: radiusSteps.map((step, stepIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuRadioItem, {
						value: String(stepIndex),
						className: "wj-menu-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: radiusLabel(step) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRadioItemIndicator, {
							className: "wj-menu-check",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								icon: import_lucide_react.Check,
								size: "sm"
							})
						})]
					}, step))
				})
			})
		})
	})] });
}
function ChipRow({ value, onChange, options, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleGroup, {
		className: "wj-chips",
		"aria-label": label,
		value: [value],
		onValueChange: (next) => {
			const picked = next[0];
			if (picked) onChange(picked);
		},
		children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
			value: option,
			className: "wj-chip",
			children: option
		}, option))
	});
}
function SearchField({ value, onValueChange, onClear, placeholder, ...rest }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "wj-search",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon: import_lucide_react.Search,
				size: "md"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				...rest,
				className: "wj-search-input",
				type: "search",
				enterKeyHint: "search",
				autoComplete: "off",
				autoCorrect: "off",
				value,
				placeholder,
				onChange: (event) => onValueChange(event.target.value)
			}),
			value && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "wj-search-clear",
				"aria-label": "清除搜索",
				onClick: onClear,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					icon: import_lucide_react.X,
					size: "sm"
				})
			})
		]
	});
}
var modes = [
	{
		value: "transit",
		label: "公交地铁",
		icon: import_lucide_react.TrainFront
	},
	{
		value: "bike",
		label: "骑行",
		icon: import_lucide_react.Bike
	},
	{
		value: "car",
		label: "驾车",
		icon: import_lucide_react.CarFront
	}
];
var categories = ["全部", ...placeCategories];
var durationOptions = [
	{
		value: -1,
		label: "无限制"
	},
	{
		value: 0,
		label: "15 分钟"
	},
	{
		value: 1,
		label: "30 分钟"
	},
	{
		value: 2,
		label: "45 分钟"
	},
	{
		value: 3,
		label: "1 小时"
	}
];
var snapPoints = [
	"232px",
	.56,
	1
];
function HomeSheet({ nearby, container, travelMode, onTravelMode, onOpen }) {
	const [snap, setSnap] = (0, import_react.useState)(snapPoints[0]);
	const { results, visible, isPending, isError, refetch, userLocation, radiusKm, radiusIndex, durationIndex, setDurationIndex } = nearby;
	const canWiden = Boolean(userLocation) && radiusKm !== 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerRoot, {
		open: true,
		modal: false,
		disablePointerDismissal: true,
		snapPoints,
		snapPoint: snap,
		onSnapPointChange: setSnap,
		onOpenChange: (_open, details) => details.cancel(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerPortal, {
			container,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerViewport, {
				className: "wj-sheet-viewport",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DrawerPopup, {
					className: "wj-sheet wj-glass",
					initialFocus: false,
					"aria-label": "附近门店",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wj-sheet-head",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "wj-grabber",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
								value: nearby.query,
								onValueChange: nearby.setQuery,
								onClear: () => nearby.setQuery(""),
								placeholder: "搜店名、区域或体验",
								"aria-label": "搜索门店",
								onFocus: () => setSnap(snapPoints[2])
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "wj-sheet-title",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DrawerTitle, {
									render: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "wj-title2" }),
									children: ["附近推荐 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wj-count",
										children: results.length
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "wj-footnote wj-secondary",
									role: "status",
									children: nearby.status
								})] })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DrawerContent, {
						className: "wj-sheet-body",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, {
								label: "门店类型",
								value: nearby.category,
								options: categories,
								onChange: nearby.setCategory
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wj-filters",
								children: [
									userLocation && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadiusMenu, {
										index: radiusIndex,
										onChange: nearby.setRadiusIndex,
										container
									}),
									userLocation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "wj-duration-select",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											icon: import_lucide_react.Clock,
											size: "sm"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: durationIndex,
											onChange: (e) => setDurationIndex(Number(e.target.value)),
											"aria-label": "驾车时间",
											children: durationOptions.map(({ value, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value,
												children: label
											}, value))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button$1, {
										variant: "secondary",
										"aria-pressed": nearby.recommended,
										onClick: () => nearby.setRecommended(!nearby.recommended),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											icon: import_lucide_react.Star,
											size: "sm",
											fill: nearby.recommended
										}), "站长推荐"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "wj-filters",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
									label: "出行方式",
									value: travelMode,
									options: [...modes],
									onChange: onTravelMode
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "wj-caption wj-secondary wj-list-note",
								children: userLocation ? "按距离由近到远排序，点\"路线\"按所选出行方式规划" : "开启精确定位后按距离排序"
							}),
							isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
								title: "暂时连接不上门店服务",
								hint: "请检查网络后重试",
								onRetry: () => void refetch()
							}) : isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonRows, {}) : results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
								icon: import_lucide_react.MapPinOff,
								title: canWiden ? `${radiusLabel(radiusKm)}内没有匹配的门店` : "没有匹配的门店",
								hint: "换个关键词，或清除筛选再试",
								actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [canWiden && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button$1, {
									variant: "primary",
									onClick: () => nearby.setRadiusIndex(Math.min(radiusIndex + 1, radiusSteps.length - 1)),
									children: ["扩大到", radiusLabel(radiusSteps[Math.min(radiusIndex + 1, radiusSteps.length - 1)])]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button$1, {
									variant: "secondary",
									onClick: () => {
										nearby.setQuery("");
										nearby.setCategory("全部");
										nearby.setRecommended(false);
										setDurationIndex(-1);
									},
									children: "清除筛选"
								})] })
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wj-list",
								children: [visible.map(({ place, distance }, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaceRow, {
									place,
									index,
									distance,
									onOpen
								}, place.id)), results.length > visible.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button$1, {
									variant: "plain",
									className: "wj-more",
									onClick: () => nearby.setLimit(nearby.limit + 50),
									children: [
										"再看 ",
										Math.min(50, results.length - visible.length),
										" 家",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											icon: import_lucide_react.ChevronDown,
											size: "sm"
										})
									]
								})]
							})
						]
					})]
				})
			})
		})
	});
}
var esc = (text) => text.replace(/[&<>"']/g, "");
function MapView({ places, selectedId, user, radiusKm, center, onSelect, onError }) {
	const mapRef = (0, import_react.useRef)(null);
	const sdkRef = (0, import_react.useRef)(null);
	const markersRef = (0, import_react.useRef)([]);
	const userMarkerRef = (0, import_react.useRef)(null);
	const placesRef = (0, import_react.useRef)(places);
	const onSelectRef = (0, import_react.useRef)(onSelect);
	const [ready, setReady] = (0, import_react.useState)(false);
	placesRef.current = places;
	onSelectRef.current = onSelect;
	(0, import_react.useEffect)(() => {
		let disposed = false;
		loadAMap().then((sdk) => {
			const host = document.getElementById("washjoy-map");
			if (disposed || !host) return;
			sdkRef.current = sdk;
			mapRef.current = new sdk.Map(host, {
				zoom: 12,
				center: cityDatasets[0].center,
				viewMode: "2D",
				mapStyle: "amap://styles/normal",
				resizeEnable: true
			});
			setReady(true);
		}).catch(onError);
		return () => {
			disposed = true;
			mapRef.current?.destroy();
			mapRef.current = null;
			setReady(false);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current, sdk = sdkRef.current;
		if (!ready || !map || !sdk) return;
		map.remove(markersRef.current);
		markersRef.current = places.flatMap((place, index) => {
			if (!place.longitude || !place.latitude) return [];
			return [new sdk.Marker({
				position: [place.longitude, place.latitude],
				title: place.name,
				anchor: "center",
				content: `<button class="wj-pin" data-place-id="${esc(place.id)}" aria-label="${index + 1} ${esc(place.name)}"><span>${index + 1}</span></button>`
			})];
		});
		map.add(markersRef.current);
	}, [ready, places]);
	(0, import_react.useEffect)(() => {
		document.querySelectorAll("#washjoy-map .wj-pin").forEach((pin) => pin.classList.toggle("is-selected", pin.dataset.placeId === selectedId));
	}, [
		selectedId,
		places,
		ready
	]);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current, sdk = sdkRef.current;
		if (!ready || !map || !sdk) return;
		if (userMarkerRef.current) {
			map.remove(userMarkerRef.current);
			userMarkerRef.current = null;
		}
		if (user) {
			userMarkerRef.current = new sdk.Marker({
				position: [user.longitude, user.latitude],
				content: "<span class=\"wj-user-dot\"></span>",
				anchor: "center",
				zIndex: 200
			});
			map.add(userMarkerRef.current);
			map.setZoomAndCenter(radiusKm === 0 ? 12 : radiusKm <= 3 ? 14 : radiusKm <= 5 ? 13 : 12, [user.longitude, user.latitude]);
		} else map.setZoomAndCenter(12, center);
	}, [
		ready,
		user,
		radiusKm,
		center
	]);
	(0, import_react.useEffect)(() => {
		const host = document.getElementById("washjoy-map");
		if (!host) return;
		let start = null;
		const down = (event) => {
			const pin = event.target?.closest?.(".wj-pin");
			start = pin?.dataset.placeId ? {
				x: event.clientX,
				y: event.clientY,
				id: pin.dataset.placeId
			} : null;
		};
		const up = (event) => {
			if (!start) return;
			const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
			const id = start.id;
			start = null;
			if (moved > 10) return;
			const place = placesRef.current.find((item) => item.id === id);
			if (place) onSelectRef.current(place);
		};
		const cancel = () => {
			start = null;
		};
		host.addEventListener("pointerdown", down, true);
		window.addEventListener("pointerup", up, true);
		window.addEventListener("pointercancel", cancel, true);
		return () => {
			host.removeEventListener("pointerdown", down, true);
			window.removeEventListener("pointerup", up, true);
			window.removeEventListener("pointercancel", cancel, true);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		id: "washjoy-map",
		className: "wj-map",
		role: "application",
		"aria-label": "地图"
	});
}
function PlaceCarousel({ images, label, fallback }) {
	const track = (0, import_react.useRef)(null);
	const reduced = useReducedMotion();
	const [index, setIndex] = (0, import_react.useState)(0);
	const [paused, setPaused] = (0, import_react.useState)(false);
	const [failed, setFailed] = (0, import_react.useState)({});
	const shown = images.filter((src) => !failed[src]);
	(0, import_react.useEffect)(() => {
		if (shown.length < 2 || paused || reduced) return;
		const timer = window.setInterval(() => {
			const el = track.current;
			if (!el) return;
			const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % shown.length;
			el.scrollTo({
				left: next * el.clientWidth,
				behavior: "smooth"
			});
		}, 4e3);
		return () => window.clearInterval(timer);
	}, [
		shown.length,
		paused,
		reduced
	]);
	if (shown.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "wj-hero wj-hero-fallback",
		role: "img",
		"aria-label": label,
		children: fallback
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "wj-hero",
		onPointerEnter: () => setPaused(true),
		onPointerLeave: () => setPaused(false),
		onFocus: () => setPaused(true),
		onBlur: () => setPaused(false),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: track,
			className: "wj-hero-track",
			"data-base-ui-swipe-ignore": "x",
			onPointerDown: () => setPaused(true),
			onPointerUp: () => setPaused(false),
			onScroll: (event) => {
				const el = event.currentTarget;
				setIndex(Math.round(el.scrollLeft / el.clientWidth));
			},
			tabIndex: 0,
			role: "group",
			"aria-roledescription": "轮播",
			"aria-label": `${label} 图片`,
			children: shown.map((src, position) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src,
				alt: `${label} ${position + 1}`,
				loading: position === 0 ? "eager" : "lazy",
				decoding: "async",
				draggable: false,
				onError: () => setFailed((current) => ({
					...current,
					[src]: true
				}))
			}, src))
		}), shown.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "wj-hero-count wj-caption",
			"aria-hidden": "true",
			children: [
				Math.min(index + 1, shown.length),
				" / ",
				shown.length
			]
		})]
	});
}
function useAdminNote(place) {
	return (0, import_react.useMemo)(() => {
		if (!(place.adminManaged || place.manual)) return null;
		const description = String(place.description || "").trim();
		const services = String(place.services || "").split(/[|｜,，、]/).map((item) => item.trim()).filter(Boolean);
		const rating = Number(place.rating) > 0 ? Number(place.rating).toFixed(1) : "";
		return description || services.length ? {
			description,
			services,
			rating
		} : null;
	}, [place]);
}
var PlaceReviews = (0, import_react.forwardRef)(function PlaceReviews({ place, signedIn }, ref) {
	const [reviews, setReviews] = (0, import_react.useState)([]);
	const [text, setText] = (0, import_react.useState)("");
	const [rating, setRating] = (0, import_react.useState)(5);
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const field = (0, import_react.useRef)(null);
	const note = useAdminNote(place);
	const query = `reviews?placeId=${encodeURIComponent(place.id)}&city=${encodeURIComponent(place.city)}`;
	const login = `${appUrl("account/")}?returnPlace=${encodeURIComponent(place.id)}`;
	(0, import_react.useImperativeHandle)(ref, () => ({ focusForm: () => {
		if (!signedIn) {
			window.location.assign(login);
			return;
		}
		field.current?.scrollIntoView({
			block: "center",
			behavior: "smooth"
		});
		field.current?.focus({ preventScroll: true });
	} }), [signedIn, login]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		setReviews([]);
		setText("");
		setError("");
		api(query).then((result) => {
			if (!cancelled) setReviews(result.reviews || []);
		}).catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [query]);
	async function submit(event) {
		event.preventDefault();
		if (!text.trim()) return;
		setBusy(true);
		setError("");
		try {
			await api("reviews", {
				method: "POST",
				body: JSON.stringify({
					place_id: place.id,
					city: place.city,
					rating,
					text: text.trim()
				})
			});
			setText("");
			setReviews((await api(query)).reviews || []);
		} catch (cause) {
			if (cause instanceof Error && /登录状态|未登录|401/.test(cause.message)) window.location.assign(login);
			else setError(cause instanceof Error ? cause.message : "评价提交失败，请重试");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "wj-reviews",
		"aria-labelledby": "wj-reviews-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				id: "wj-reviews-title",
				className: "wj-headline",
				children: ["用户评价 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "wj-count",
					children: reviews.length + (note ? 1 : 0)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "wj-review-form",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "wj-stars",
						role: "group",
						"aria-label": "评分",
						children: [
							1,
							2,
							3,
							4,
							5
						].map((score) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: score <= rating ? "is-on" : "",
							"aria-label": `${score} 星`,
							"aria-pressed": rating === score,
							onClick: () => setRating(score),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								icon: import_lucide_react.Star,
								size: "lg",
								fill: score <= rating
							})
						}, score))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						ref: field,
						value: text,
						onChange: (event) => setText(event.target.value),
						maxLength: 500,
						rows: 3,
						placeholder: "分享这次体验",
						"aria-label": "评价内容",
						"aria-invalid": Boolean(error),
						"aria-describedby": error ? "wj-review-error" : void 0
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wj-review-actions",
						children: [error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							id: "wj-review-error",
							className: "wj-footnote wj-danger",
							role: "alert",
							children: error
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button$1, {
							type: "submit",
							variant: "primary",
							loading: busy,
							disabled: !text.trim(),
							children: "发布评价"
						})]
					})
				]
			}),
			note && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "wj-review wj-review-admin",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wj-badge wj-caption",
							children: "站长"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "wj-subhead",
							children: "站长点评"
						}),
						note.rating && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "wj-rating wj-footnote",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								icon: import_lucide_react.Star,
								size: "sm",
								fill: true
							}), note.rating]
						})
					] }),
					note.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "wj-subhead",
						children: note.description
					}),
					note.services.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "wj-tags",
						children: note.services.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wj-tag wj-footnote",
							children: item
						}, item))
					})
				]
			}),
			reviews.map((review) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "wj-review",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "wj-subhead",
						children: review.author || "用户"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "wj-rating wj-footnote",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							icon: import_lucide_react.Star,
							size: "sm",
							fill: true
						}), review.rating]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
						className: "wj-footnote wj-secondary",
						children: (/* @__PURE__ */ new Date(review.created * 1e3)).toLocaleDateString("zh-CN")
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "wj-subhead",
					children: review.text
				})]
			}, review.id))
		]
	});
});
var uriMode = {
	transit: "bus",
	bike: "ride",
	car: "car"
};
function formatDuration(seconds) {
	if (!seconds) return "";
	const minutes = Math.round(seconds / 60);
	if (minutes < 1) return "< 1 分钟";
	return `${minutes} 分钟`;
}
function routeUrl(place, mode, from) {
	if (!place.longitude || !place.latitude) return `https://uri.amap.com/search?keyword=${encodeURIComponent(`${place.name} ${place.address}`)}`;
	const origin = from ? `&from=${from.longitude},${from.latitude},${encodeURIComponent("我的位置")}` : "";
	return `https://uri.amap.com/navigation?to=${place.longitude},${place.latitude},${encodeURIComponent(place.name)}${origin}&mode=${uriMode[mode]}&policy=1&src=washjoy`;
}
function PlaceDetail({ place, onClose, container, datasetName, distance, user, travelMode, signedIn, saved, onToggleSaved }) {
	const [last, setLast] = (0, import_react.useState)(place);
	const [displayPlace, setDisplayPlace] = (0, import_react.useState)(place);
	const [travelDuration, setTravelDuration] = (0, import_react.useState)(null);
	const reviews = (0, import_react.useRef)(null);
	if (place && place !== last) setLast(place);
	const shown = place ?? last;
	const km = formatDistance(distance);
	(0, import_react.useEffect)(() => {
		if (!shown) return;
		let cancelled = false;
		const fetchPoiReviews = async () => {
			const poiData = await getPoiReviews(shown.name, shown.city);
			if (!cancelled && poiData) setDisplayPlace({
				...shown,
				poiRating: poiData.averageRating,
				poiRatingCount: poiData.ratingCount
			});
			else setDisplayPlace(shown);
		};
		fetchPoiReviews();
		return () => {
			cancelled = true;
		};
	}, [shown]);
	(0, import_react.useEffect)(() => {
		if (!shown || !user || travelMode !== "car" || !shown.latitude || !shown.longitude) {
			setTravelDuration(null);
			return;
		}
		let cancelled = false;
		const fetchTravelDuration = async () => {
			const duration = await getDrivingDuration([user.longitude, user.latitude], [shown.longitude, shown.latitude]);
			if (!cancelled) setTravelDuration(duration);
		};
		fetchTravelDuration();
		return () => {
			cancelled = true;
		};
	}, [
		shown,
		user,
		travelMode
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerRoot, {
		open: Boolean(place),
		onOpenChange: (open) => {
			if (!open) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DrawerPortal, {
			container,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerBackdrop, { className: "wj-backdrop" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerViewport, {
				className: "wj-detail-viewport",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DrawerPopup, {
					className: "wj-detail",
					"aria-label": shown?.name,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wj-detail-top",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "wj-grabber",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerClose, {
							className: "wj-btn wj-btn-glass wj-btn-icon wj-detail-close",
							"aria-label": "关闭门店详情",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								icon: import_lucide_react.X,
								size: "md"
							})
						})]
					}), shown && displayPlace && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DrawerContent, {
						className: "wj-detail-body",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaceCarousel, {
							images: displayPlace.images.length ? displayPlace.images : displayPlace.image ? [displayPlace.image] : [],
							label: displayPlace.name,
							fallback: displayPlace.category
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "wj-detail-info",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "wj-footnote wj-accent",
									children: [
										displayPlace.category,
										" · ",
										datasetName
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrawerTitle, {
									render: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "wj-title2" }),
									children: displayPlace.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "wj-subhead wj-secondary wj-meta-line",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "wj-rating",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
												icon: import_lucide_react.Star,
												size: "sm",
												fill: true
											}), displayPlace.poiRating ? displayPlace.poiRating.toFixed(1) : displayPlace.score?.toFixed(1) ?? "新店"]
										}),
										(displayPlace.poiRatingCount ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "wj-caption wj-secondary",
											children: [
												"(",
												displayPlace.poiRatingCount,
												" 条评价)"
											]
										}),
										travelDuration && travelMode === "car" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "wj-travel-time",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
												icon: import_lucide_react.Clock,
												size: "sm"
											}), formatDuration(travelDuration)]
										}),
										!travelDuration && km && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: km }),
										formatPrice(displayPlace.price) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["人均 ", formatPrice(displayPlace.price)] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "wj-actions",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button$1, {
											variant: "secondary",
											"aria-pressed": saved,
											onClick: () => onToggleSaved(shown),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
												icon: import_lucide_react.Heart,
												size: "md",
												fill: saved
											}), saved ? "已收藏" : "收藏"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button$1, {
											variant: "secondary",
											onClick: () => reviews.current?.focusForm(),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
												icon: import_lucide_react.MessageSquareText,
												size: "md"
											}), "写评价"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											className: "wj-btn wj-btn-primary",
											href: routeUrl(displayPlace, travelMode, user),
											target: "_blank",
											rel: "noopener noreferrer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
												icon: import_lucide_react.Navigation,
												size: "md"
											}), "路线"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
									className: "wj-info-list",
									children: [
										displayPlace.address && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											icon: import_lucide_react.MapPin,
											size: "md",
											className: "wj-list-icon"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "wj-subhead",
											children: displayPlace.address
										})] }),
										displayPlace.openTime && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											icon: import_lucide_react.Clock3,
											size: "md",
											className: "wj-list-icon"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "wj-subhead",
											children: ["营业时间 ", displayPlace.openTime]
										})] }),
										displayPlace.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											icon: import_lucide_react.Phone,
											size: "md",
											className: "wj-list-icon"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											className: "wj-subhead wj-accent",
											href: `tel:${displayPlace.phone.split(/[;,]/)[0]}`,
											children: displayPlace.phone
										})] })
									]
								}),
								displayPlace.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "wj-tags",
									children: displayPlace.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "wj-tag wj-footnote",
										children: tag
									}, tag))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaceReviews, {
									ref: reviews,
									place: shown,
									signedIn
								})
							]
						})]
					})]
				})
			})]
		})
	});
}
function Home() {
	const nearby = useNearby();
	const [shell, setShell] = (0, import_react.useState)(null);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [travelMode, setTravelMode] = (0, import_react.useState)("transit");
	const [mapError, setMapError] = (0, import_react.useState)(false);
	const [session, setSession] = (0, import_react.useState)(null);
	const [saved, setSaved] = (0, import_react.useState)([]);
	const { userLocation, dataset, visible, allPlaces } = nearby;
	(0, import_react.useEffect)(() => {
		getSession().then(setSession);
	}, []);
	(0, import_react.useEffect)(() => {
		try {
			setSaved(JSON.parse(localStorage.getItem(savedPlacesKey(session)) || "[]"));
		} catch {
			setSaved([]);
		}
	}, [session]);
	(0, import_react.useEffect)(() => {
		const id = new URLSearchParams(window.location.search).get("place");
		if (!id || allPlaces.length === 0) return;
		const match = allPlaces.find((place) => place.id === id);
		if (match) setSelected(match);
		const url = new URL(window.location.href);
		url.searchParams.delete("place");
		window.history.replaceState(null, "", url);
	}, [allPlaces]);
	const toggleSaved = (0, import_react.useCallback)((place) => {
		if (!session) {
			window.location.assign(`${appUrl("account/")}?returnPlace=${encodeURIComponent(place.id)}`);
			return;
		}
		const next = saved.includes(place.id) ? saved.filter((id) => id !== place.id) : [...saved, place.id];
		setSaved(next);
		localStorage.setItem(savedPlacesKey(session), JSON.stringify(next));
	}, [saved, session]);
	const mapPlaces = (0, import_react.useMemo)(() => visible.map(({ place }) => place), [visible]);
	const distance = selected && userLocation && selected.latitude && selected.longitude ? distanceInKm(userLocation.latitude, userLocation.longitude, selected.latitude, selected.longitude) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "wj-app wj-home",
		ref: setShell,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapView, {
				places: mapPlaces,
				selectedId: selected?.id ?? null,
				user: userLocation,
				radiusKm: nearby.radiusKm,
				center: dataset.center,
				onSelect: setSelected,
				onError: () => setMapError(true)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "wj-brand wj-glass",
				role: "status",
				"aria-label": "当前城市",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					icon: import_lucide_react.MapPin,
					size: "sm"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "wj-subhead",
					children: nearby.fix?.city || (nearby.locating ? "定位中…" : "未定位")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button$1, {
				variant: "glass",
				iconOnly: true,
				className: "wj-locate",
				"aria-label": "定位到当前位置",
				loading: nearby.locating,
				onClick: nearby.locateUser,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					icon: import_lucide_react.LocateFixed,
					size: "md"
				})
			}),
			mapError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "wj-map-error wj-glass wj-footnote",
				role: "status",
				children: "地图服务暂不可用，门店列表仍可浏览"
			}),
			shell && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeSheet, {
				nearby,
				container: shell,
				travelMode,
				onTravelMode: setTravelMode,
				onOpen: setSelected
			}),
			shell && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaceDetail, {
				place: selected,
				onClose: () => setSelected(null),
				container: shell,
				datasetName: dataset.name,
				distance,
				user: userLocation,
				travelMode,
				signedIn: Boolean(session),
				saved: Boolean(selected && saved.includes(selected.id)),
				onToggleSaved: toggleSaved
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBar, { active: "nearby" })
		]
	});
}
export { Home as component };
