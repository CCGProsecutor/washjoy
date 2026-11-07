import { i as __toESM } from "../_runtime.mjs";
import { a as placeCategories, i as getSession, n as appUrl, o as savedPlacesKey, r as getPlaces, t as api } from "./api-DyeFQMCW.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
import { r as AnimatePresence, t as useReducedMotion } from "../_libs/framer-motion+[...].mjs";
import { t as motion } from "../_libs/motion.mjs";
// node_modules/.nitro/vite/services/ssr/assets/routes-lvbaBb7l.js
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
		id: "zhenjiang",
		name: "镇江市",
		center: [119.4525, 32.2044]
	},
	{
		id: "yangzhou",
		name: "扬州市",
		center: [119.4129, 32.3942]
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
				"AMap.CitySearch"
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
var radiusSteps = [
	3,
	5,
	10,
	0
];
var radiusLabel = (km) => km === 0 ? "全城" : `${km} 公里`;
var categories = ["全部", ...placeCategories];
var travelModes = [
	{
		id: "transit",
		label: "公交地铁",
		Icon: import_lucide_react.TrainFront
	},
	{
		id: "bike",
		label: "骑行",
		Icon: import_lucide_react.Bike
	},
	{
		id: "car",
		label: "驾车",
		Icon: import_lucide_react.CarFront
	}
];
function distanceInKm(lat1, lon1, lat2, lon2) {
	const radians = (value) => value * Math.PI / 180;
	const dLat = radians(lat2 - lat1);
	const dLon = radians(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
	return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function Home() {
	const prefersReducedMotion = useReducedMotion();
	const [category, setCategory] = (0, import_react.useState)("全部");
	const [travelMode, setTravelMode] = (0, import_react.useState)("transit");
	const [query, setQuery] = (0, import_react.useState)("");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [filtersOpen, setFiltersOpen] = (0, import_react.useState)(false);
	const [recommended, setRecommended] = (0, import_react.useState)(false);
	const [limit, setLimit] = (0, import_react.useState)(50);
	const [fix, setFix] = (0, import_react.useState)(null);
	const [locationState, setLocationState] = (0, import_react.useState)("pending");
	const [locating, setLocating] = (0, import_react.useState)(false);
	const [locationMessage, setLocationMessage] = (0, import_react.useState)("");
	const [radiusIndex, setRadiusIndex] = (0, import_react.useState)(0);
	const [mapReady, setMapReady] = (0, import_react.useState)(false);
	const [reviews, setReviews] = (0, import_react.useState)([]);
	const [reviewText, setReviewText] = (0, import_react.useState)("");
	const [reviewRating, setReviewRating] = (0, import_react.useState)(5);
	const [reviewError, setReviewError] = (0, import_react.useState)("");
	const [reviewBusy, setReviewBusy] = (0, import_react.useState)(false);
	const [mapError, setMapError] = (0, import_react.useState)(false);
	const [session, setSession] = (0, import_react.useState)(null);
	const [saved, setSaved] = (0, import_react.useState)([]);
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
	function locateUser() {
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
			setLocationMessage(/denied|permission|PERMISSION/i.test(text) ? "请允许浏览器定位权限" : /timeout|TIMEOUT/i.test(text) ? "定位超时，请重试" : "暂时无法定位，可点右上角重试");
		}).finally(() => setLocating(false));
	}
	(0, import_react.useEffect)(() => {
		locateUser();
	}, []);
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
	function toggleSaved(place) {
		if (!session) {
			window.location.assign(`${appUrl("account/")}?returnPlace=${encodeURIComponent(place.id)}`);
			return;
		}
		const next = saved.includes(place.id) ? saved.filter((id) => id !== place.id) : [...saved, place.id];
		setSaved(next);
		localStorage.setItem(savedPlacesKey(session), JSON.stringify(next));
	}
	const places = (0, import_react.useMemo)(() => data.filter((place) => {
		const matchesQuery = `${place.name} ${place.address} ${place.category}`.toLowerCase().includes(query.trim().toLowerCase());
		const matchesCategory = category === "全部" || place.category === category;
		return matchesQuery && matchesCategory && (!recommended || place.recommended);
	}).map((place) => ({
		place,
		distance: userLocation && place.latitude && place.longitude ? distanceInKm(userLocation.latitude, userLocation.longitude, place.latitude, place.longitude) : null
	})).filter(({ distance }) => !userLocation || radiusKm === 0 || distance !== null && distance <= radiusKm).sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE)).map(({ place }) => place), [
		category,
		data,
		query,
		recommended,
		userLocation,
		radiusKm
	]);
	(0, import_react.useEffect)(() => {
		if (!selected) {
			setReviews([]);
			setReviewText("");
			setReviewError("");
			return;
		}
		let cancelled = false;
		api(`reviews?placeId=${encodeURIComponent(selected.id)}&city=${encodeURIComponent(selected.city)}`).then((result) => {
			if (!cancelled) setReviews(result.reviews || []);
		}).catch(() => {
			if (!cancelled) setReviews([]);
		});
		return () => {
			cancelled = true;
		};
	}, [selected]);
	async function submitReview(event) {
		event.preventDefault();
		if (!selected || !reviewText.trim()) return;
		setReviewBusy(true);
		setReviewError("");
		try {
			await api("reviews", {
				method: "POST",
				body: JSON.stringify({
					place_id: selected.id,
					city: selected.city,
					rating: reviewRating,
					text: reviewText.trim()
				})
			});
			setReviewText("");
			const result = await api(`reviews?placeId=${encodeURIComponent(selected.id)}&city=${encodeURIComponent(selected.city)}`);
			setReviews(result.reviews || []);
		} catch (cause) {
			if (cause instanceof Error && /登录状态|未登录|401/.test(cause.message)) window.location.assign(`${appUrl("account/")}?returnPlace=${encodeURIComponent(selected.id)}`);
			else setReviewError(cause instanceof Error ? cause.message : "评价提交失败，请重试");
		} finally {
			setReviewBusy(false);
		}
	}
	const mapRef = (0, import_react.useRef)(null);
	const sdkRef = (0, import_react.useRef)(null);
	const markersRef = (0, import_react.useRef)([]);
	const userMarkerRef = (0, import_react.useRef)(null);
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
			setMapReady(true);
		}).catch(() => setMapError(true));
		return () => {
			disposed = true;
			mapRef.current?.destroy();
			mapRef.current = null;
			setMapReady(false);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current, sdk = sdkRef.current;
		if (!mapReady || !map || !sdk) return;
		map.remove(markersRef.current);
		markersRef.current = places.slice(0, limit).flatMap((place, index) => {
			if (!place.longitude || !place.latitude) return [];
			return [new sdk.Marker({
				position: [place.longitude, place.latitude],
				title: place.name,
				anchor: "bottom-center",
				content: `<button class="map-pin" data-place-id="${place.id.replace(/"/g, "")}" aria-label="${index + 1} ${place.name.replace(/"/g, "")}"><small>${index + 1}</small></button>`
			})];
		});
		map.add(markersRef.current);
	}, [
		mapReady,
		places,
		limit
	]);
	const placesRef = (0, import_react.useRef)(places);
	placesRef.current = places;
	(0, import_react.useEffect)(() => {
		const host = document.getElementById("washjoy-map");
		if (!host) return;
		let start = null;
		const down = (event) => {
			const pin = event.target?.closest?.(".map-pin");
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
			if (place) setSelected(place);
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
	}, [mapReady]);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current, sdk = sdkRef.current;
		if (!mapReady || !map || !sdk) return;
		if (userMarkerRef.current) {
			map.remove(userMarkerRef.current);
			userMarkerRef.current = null;
		}
		if (userLocation) {
			userMarkerRef.current = new sdk.Marker({
				position: [userLocation.longitude, userLocation.latitude],
				content: "<span class=\"amap-user-dot\"></span>",
				anchor: "center",
				zIndex: 200
			});
			map.add(userMarkerRef.current);
			map.setZoomAndCenter(radiusKm === 0 ? 12 : radiusKm <= 1 ? 15 : radiusKm <= 3 ? 14 : 13, [userLocation.longitude, userLocation.latitude]);
		} else map.setZoomAndCenter(12, dataset.center);
	}, [
		mapReady,
		userLocation,
		radiusKm,
		dataset
	]);
	const adminNote = (0, import_react.useMemo)(() => {
		if (!selected || !(selected.adminManaged || selected.manual)) return null;
		const description = String(selected.description || "").trim();
		const services = String(selected.services || "").split(/[|｜,，、]/).map((item) => item.trim()).filter(Boolean);
		const rating = Number(selected.rating) > 0 ? Number(selected.rating).toFixed(1) : "";
		return description || services.length ? {
			description,
			services,
			rating
		} : null;
	}, [selected]);
	const transition = prefersReducedMotion ? { duration: 0 } : {
		type: "spring",
		damping: 28,
		stiffness: 260,
		mass: .8
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "topbar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						className: "brand",
						href: appUrl(),
						"aria-label": "Washjoy 附近",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "brand-mark",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Washjoy" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "city-button",
						role: "status",
						"aria-label": "当前定位城市",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MapPin, { size: 16 }), fix?.city || (locating ? "定位中…" : "未定位")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "avatar-link",
						href: appUrl("account/"),
						"aria-label": "账户",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "林" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "map-stage",
				"aria-label": "附近门店地图",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "map-art",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							viewBox: "0 0 1000 760",
							preserveAspectRatio: "xMidYMid slice",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
									className: "river",
									d: "M-60 510 C150 390 240 610 430 495 S720 360 1060 460 L1060 640 C780 570 650 700 410 630 S130 680 -60 740Z"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
									className: "park",
									d: "M30 85h180v110H30zM735 80h210v120H735zM780 595h240v130H780zM180 580h170v130H180z"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
									className: "road",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M-40 300 1040 250M90 -30 200 800M435 -30 520 800M780 -30 715 800M-30 720 1010 120M-20 110 1030 670" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M-30 420 1020 405M-30 180 1030 520" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {
									className: "block",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M248 80h128v68H248zM560 90h122v94H560zM278 224h105v88H278zM560 230h138v110H560zM55 380h95v95H55zM854 300h105v105H854zM385 690h100v75H385zM610 585h120v100H610z" })
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "washjoy-map",
						className: "amap-host",
						"aria-label": "地图互动区域"
					}),
					mapError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "map-fallback-status",
						role: "status",
						children: "地图服务暂不可用，门店列表仍可浏览"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "map-topline",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "search-field",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Search, { size: 19 }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "place-search",
									value: query,
									onChange: (event) => setQuery(event.target.value),
									placeholder: "搜店名、区域或体验"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", { children: "⌘ K" })
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "icon-button locate-button",
							"aria-label": "定位到当前位置",
							title: locationState === "failed" ? locationMessage || "定位失败，请重试" : "定位到当前位置",
							onClick: locateUser,
							disabled: locating,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LocateFixed, { size: 19 })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "map-side-actions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "map-action",
							"aria-label": "重新定位",
							title: "重新定位",
							onClick: locateUser,
							disabled: locating,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Navigation, { size: 17 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "map-action",
							onClick: () => setFiltersOpen(true),
							"aria-label": "打开筛选",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.SlidersHorizontal, { size: 17 })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "map-footer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "map-status",
							role: "status",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "status-dot" }),
								locating ? "正在获取位置…" : isPending ? "正在查找门店" : userLocation ? `${places.length} 家门店 · ${radiusLabel(radiusKm)}内` : `${places.length} 家门店`,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "status-separator",
									children: "·"
								}),
								locating ? "定位中" : locationState === "failed" ? locationMessage || "定位失败，可重试" : outsideCoverage ? `${fix?.city}暂无数据，显示${dataset.name}` : locationState === "ready" ? fix?.precise ? "已定位" : "大致位置，点右上角重试" : `${dataset.name}默认视野`
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "travel-control",
							"aria-label": "出行方式",
							children: travelModes.map(({ id, label, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: travelMode === id ? "selected" : "",
								onClick: () => setTravelMode(id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 15 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
							}, id))
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "category-tabs",
				"aria-label": "门店类型",
				children: categories.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: category === item ? "active" : "",
					onClick: () => {
						setCategory(item);
						setLimit(50);
					},
					children: item
				}, item))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.section, {
				className: "results-sheet",
				layout: true,
				transition,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sheet-grabber",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sheet-heading",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "section-kicker",
							children: "根据位置为你整理"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: ["附近推荐 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: places.length })] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: `recommend-toggle ${recommended ? "active" : ""}`,
							"aria-pressed": recommended,
							onClick: () => setRecommended(!recommended),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Star, {
								size: 16,
								fill: recommended ? "currentColor" : "none"
							}), "站长推荐"]
						})]
					}),
					filtersOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "filter-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Clock3, { size: 14 }), "预计到达"] }),
							[
								15,
								30,
								45,
								60
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setFiltersOpen(false),
								children: n === 60 ? "1 小时内" : `${n} 分钟内`
							}, n)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "filter-close",
								onClick: () => setFiltersOpen(false),
								"aria-label": "关闭筛选",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.X, { size: 15 })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "result-caption",
						children: isPending ? "正在同步附近门店…" : isError ? "门店数据暂时不可用" : `按${travelModes.find((mode) => mode.id === travelMode)?.label}预计时间排序`
					}),
					isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "empty-state",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "暂时连接不上门店服务" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => void refetch(),
							children: "重试"
						})]
					}) : isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "place-grid",
						children: [
							0,
							1,
							2
						].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "place-skeleton",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
							] })]
						}, item))
					}) : places.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "empty-state",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: userLocation && radiusKm !== 0 ? `${radiusLabel(radiusKm)}内没有匹配的门店` : "没有匹配的门店" }),
							userLocation && radiusKm !== 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setRadiusIndex(radiusIndex + 1),
								children: ["扩大到", radiusLabel(radiusSteps[radiusIndex + 1])]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									setQuery("");
									setCategory("全部");
									setRecommended(false);
								},
								children: "清除筛选"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "place-grid",
						children: places.slice(0, limit).map((place, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
							className: "place-card",
							layout: true,
							initial: prefersReducedMotion ? false : {
								opacity: 0,
								y: 12
							},
							animate: {
								opacity: 1,
								y: 0
							},
							transition: {
								...transition,
								delay: prefersReducedMotion ? 0 : Math.min(index * .025, .15)
							},
							onClick: () => setSelected(place),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "place-image",
									children: [place.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: place.image,
										alt: "",
										loading: "lazy"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `image-placeholder tone-${index % 4}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: place.category || "附近体验" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "image-fade" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "place-copy",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "place-top",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "place-type",
												children: place.category || "休闲体验"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "place-score",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Star, {
													size: 13,
													fill: "currentColor"
												}), place.score?.toFixed(1) ?? "新店"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: place.name }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: place.address || `${dataset.name} · 查看位置` }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "place-tags",
											children: (place.tags ?? []).slice(0, 2).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tag }, tag))
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "card-arrow",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ChevronDown, { size: 16 })
								})
							]
						}, place.id))
					}),
					places.length > limit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "load-more",
						onClick: () => setLimit(limit + 50),
						children: ["继续加载更多（再 50 家） ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ChevronDown, { size: 15 })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bottom-nav",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						className: "active",
						href: appUrl(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MapPin, { size: 19 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "附近" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: appUrl("mine/"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heart, { size: 19 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "收藏" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: appUrl("account/"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MessageSquareText, { size: 19 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "我的" })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				className: "detail-backdrop",
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
				onClick: () => setSelected(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.aside, {
					className: "detail-panel",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": selected.name,
					initial: { y: "100%" },
					animate: { y: 0 },
					exit: { y: "100%" },
					transition,
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "detail-handle" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "detail-close",
							onClick: () => setSelected(null),
							"aria-label": "关闭门店详情",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.X, { size: 19 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "detail-cover",
							children: selected.image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: selected.image,
								alt: ""
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "detail-cover-fallback",
								children: selected.category || "附近体验"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "detail-content",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "detail-eyebrow",
									children: [
										selected.category || "休闲体验",
										" · ",
										dataset.name
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selected.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "detail-rating",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Star, {
											size: 16,
											fill: "currentColor"
										}),
										selected.score?.toFixed(1) ?? "新店",
										userLocation && selected.latitude && selected.longitude && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
											" ",
											distanceInKm(userLocation.latitude, userLocation.longitude, selected.latitude, selected.longitude).toFixed(1),
											" km"
										] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.address || `${dataset.name} · 查看位置` }),
								selected.price && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "detail-price",
									children: ["人均 ¥", selected.price]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "detail-tags",
									children: selected.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tag }, tag))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "detail-actions",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											className: `save-button ${saved.includes(selected.id) ? "is-saved" : ""}`,
											"aria-pressed": saved.includes(selected.id),
											onClick: () => toggleSaved(selected),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heart, {
												size: 17,
												fill: saved.includes(selected.id) ? "currentColor" : "none"
											}), saved.includes(selected.id) ? "已收藏" : "收藏"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: `/washjoy/account/?returnPlace=${encodeURIComponent(selected.id)}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MessageSquareText, { size: 17 }), "写评价"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											className: "primary-action",
											onClick: () => {
												if (selected.longitude && selected.latitude) window.open(`https://uri.amap.com/marker?position=${selected.longitude},${selected.latitude}&name=${encodeURIComponent(selected.name)}`, "_blank", "noopener");
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Navigation, { size: 17 }), "路线"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "reviews-section",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["用户评价 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: reviews.length + (adminNote ? 1 : 0) })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
											className: "review-form",
											onSubmit: submitReview,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "rating-picker",
													"aria-label": "评分",
													children: [
														1,
														2,
														3,
														4,
														5
													].map((score) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														"aria-label": `${score} 星`,
														"aria-pressed": reviewRating === score,
														onClick: () => setReviewRating(score),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Star, {
															size: 17,
															fill: score <= reviewRating ? "currentColor" : "none"
														})
													}, score))
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
													value: reviewText,
													onChange: (event) => setReviewText(event.target.value),
													maxLength: 500,
													placeholder: "分享这次体验",
													"aria-label": "评价内容"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "review-submit-row",
													children: [reviewError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														role: "alert",
														children: reviewError
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														disabled: reviewBusy || !reviewText.trim(),
														children: reviewBusy ? "提交中…" : "发布评价"
													})]
												})
											]
										}),
										adminNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
											className: "review-item admin-review",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "admin-badge",
													children: "站长"
												}), "站长点评"] }), adminNote.rating && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "admin-review-score",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Star, {
														size: 12,
														fill: "currentColor"
													}), adminNote.rating]
												})] }),
												adminNote.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: adminNote.description }),
												adminNote.services.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "admin-review-tags",
													children: adminNote.services.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item }, item))
												})
											]
										}),
										reviews.map((review) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
											className: "review-item",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: review.author || "用户" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: (/* @__PURE__ */ new Date(review.created * 1e3)).toLocaleDateString("zh-CN") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: review.text })]
										}, review.id))
									]
								})
							]
						})
					]
				})
			}) })
		]
	});
}
export { Home as component };
