// node_modules/.nitro/vite/services/ssr/assets/api-BQyxYK3H.js
var appUrl = (path = "") => `/washjoy/${path.replace(/^\//, "")}`;
async function api(path, init) {
	const response = await fetch(`/washjoy/api/${path}`, {
		credentials: "same-origin",
		...init,
		headers: {
			...init?.body ? { "Content-Type": "application/json" } : {},
			...init?.headers
		}
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`);
	return data;
}
function number(value) {
	if (typeof value === "number") return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : void 0;
	}
}
var placeCategories = [
	"洗浴中心",
	"大众澡堂",
	"足疗会所",
	"街边店",
	"私汤"
];
var hasAny = (text, words) => words.some((word) => text.includes(word));
function inferCategory(raw) {
	const kind = String(raw.type || "");
	const text = `${raw.name || ""} ${kind}`;
	const cost = number(raw.biz_ext?.cost) ?? number(raw.cost) ?? 0;
	if (hasAny(text, [
		"足疗",
		"足浴",
		"足道",
		"修脚",
		"足艺",
		"足保",
		"采耳"
	])) return cost >= 130 || hasAny(text, [
		"连锁",
		"足道",
		"足艺",
		"会所",
		"养生"
	]) ? "足疗会所" : "街边店";
	if (hasAny(text, [
		"大众浴室",
		"大众浴池",
		"澡堂",
		"浴池",
		"浴室",
		"社区浴",
		"便民浴",
		"工人浴"
	]) || cost > 0 && cost < 80 && kind.includes("洗浴推拿场所")) return "大众澡堂";
	if (hasAny(text, [
		"洗浴",
		"温泉",
		"汤泉",
		"水会",
		"水汇",
		"汗蒸"
	]) && cost > 0 && cost < 80) return "大众澡堂";
	if (hasAny(text, [
		"街边店",
		"小店",
		"便民"
	])) return "街边店";
	return "洗浴中心";
}
function normalizePlace(raw, city = "nanjing") {
	const location = typeof raw.location === "string" ? raw.location.split(",").map(Number) : [number(raw.location?.lng), number(raw.location?.lat)];
	const photos = Array.isArray(raw.photos) ? raw.photos.map((photo) => typeof photo === "string" ? photo : photo?.url).filter(Boolean) : [];
	const score = number(raw.reviewRating) ?? number(raw.biz_ext?.rating) ?? number(raw.rating);
	const category = placeCategories.includes(raw.adminCategory) ? raw.adminCategory : inferCategory(raw);
	return {
		...raw,
		id: String(raw.id),
		name: String(raw.name || ""),
		address: String(raw.address || ""),
		category,
		longitude: location[0],
		latitude: location[1],
		score,
		image: photos[0],
		images: photos,
		tags: Array.isArray(raw.tags) ? raw.tags : [],
		recommended: raw.recommended === true,
		city: String(raw.cityId || raw.city || city),
		price: String(raw.biz_ext?.cost || raw.price || ""),
		rating: String(raw.biz_ext?.rating || raw.rating || ""),
		openTime: String(raw.biz_ext?.open_time || raw.openTime || "")
	};
}
async function getPlaces(city = "nanjing") {
	return ((await api(`public-data?city=${encodeURIComponent(city)}`)).pois || []).map((place) => normalizePlace(place, city));
}
async function getSession() {
	try {
		const response = await fetch(`/washjoy/api/auth/me`, { credentials: "same-origin" });
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}
function savedPlacesKey(user) {
	return `washjoy:saved:${user?.phone || "guest"}`;
}
function formatPrice(price) {
	const value = Number(price);
	return Number.isFinite(value) && value > 0 ? `¥${Math.round(value)}` : "";
}
export { getSession as a, getPlaces as i, appUrl as n, placeCategories as o, formatPrice as r, savedPlacesKey as s, api as t };
