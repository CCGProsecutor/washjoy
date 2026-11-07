import { i as __toESM } from "../_runtime.mjs";
import { a as getSession, t as api } from "./api-BQyxYK3H.mjs";
import { C as require_react, w as require_jsx_runtime } from "../_libs/@base-ui/react+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/admin-_d4-EzSD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
var blank = () => ({
	id: "",
	city: "nanjing",
	name: "",
	category: "洗浴中心",
	address: "",
	area: "",
	phone: "",
	price: "",
	rating: "",
	openTime: "",
	description: "",
	services: "",
	images: [],
	techs: [],
	location: "",
	recommended: false
});
function Admin() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [places, setPlaces] = (0, import_react.useState)([]);
	const [trash, setTrash] = (0, import_react.useState)([]);
	const [reviews, setReviews] = (0, import_react.useState)([]);
	const [selectedId, setSelectedId] = (0, import_react.useState)("");
	const [form, setForm] = (0, import_react.useState)(blank());
	const [search, setSearch] = (0, import_react.useState)("");
	const [tab, setTab] = (0, import_react.useState)("basic");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)("");
	const [mobileEdit, setMobileEdit] = (0, import_react.useState)(false);
	const visible = (0, import_react.useMemo)(() => places.filter((place) => `${place.name} ${place.address} ${place.area}`.toLowerCase().includes(search.toLowerCase())), [places, search]);
	async function load(keep = "") {
		const data = await api("admin/places?city=nanjing");
		setPlaces(data.places || []);
		const id = keep || selectedId || data.places?.[0]?.id || "";
		setSelectedId(id);
		const place = data.places?.find((item) => item.id === id);
		if (place) setForm({ ...place });
	}
	async function loadTrash() {
		const data = await api("admin/trash?city=nanjing");
		setTrash(data.places || []);
	}
	async function loadReviews() {
		const data = await api(`admin/reviews?placeId=${encodeURIComponent(selectedId)}&city=nanjing`);
		setReviews(data.reviews || []);
	}
	(0, import_react.useEffect)(() => {
		let active = true;
		getSession().then(async (session) => {
			if (!active) return;
			if (!session || session.role !== "admin") {
				setUser(null);
				setError(session ? "此账号没有管理员权限" : "请先登录管理员账号");
				return;
			}
			setUser(session);
			try {
				await load();
				await loadTrash();
			} catch (cause) {
				if (active) setError(cause instanceof Error ? cause.message : "后台数据加载失败");
			}
		});
		return () => {
			active = false;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (tab === "reviews" && user && selectedId) loadReviews().catch((cause) => setError(cause.message));
	}, [
		tab,
		selectedId,
		user
	]);
	async function save() {
		if (!selectedId || !form.name.trim()) {
			setError("门店名称必填");
			return;
		}
		setBusy(true);
		setError("");
		setMessage("");
		try {
			await api(`admin/places/${encodeURIComponent(selectedId)}`, {
				method: "PUT",
				body: JSON.stringify(form)
			});
			await load(selectedId);
			setMessage("门店已保存");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "保存失败，表单内容已保留");
		} finally {
			setBusy(false);
		}
	}
	async function create() {
		setBusy(true);
		setError("");
		try {
			await load((await api("admin/places", {
				method: "POST",
				body: JSON.stringify({
					...blank(),
					name: "新建门店"
				})
			})).id);
			setMobileEdit(true);
			setMessage("新门店已创建");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "创建失败");
		} finally {
			setBusy(false);
		}
	}
	async function remove(place) {
		if (!window.confirm(`将“${place.name}”移入回收站？`)) return;
		setBusy(true);
		setError("");
		try {
			await api(`admin/places/${encodeURIComponent(place.id)}?city=nanjing`, { method: "DELETE" });
			await load();
			await loadTrash();
			setMessage("门店已移入回收站");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "删除失败");
		} finally {
			setBusy(false);
		}
	}
	async function restore(place) {
		try {
			await api(`admin/places/${encodeURIComponent(place.id)}/restore?city=nanjing`, { method: "POST" });
			await load();
			await loadTrash();
			setMessage("门店已恢复");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "恢复失败");
		}
	}
	async function uploadImages(files) {
		if (!files?.length) return;
		setBusy(true);
		setError("");
		try {
			const additions = await Promise.all(Array.from(files).map(async (file) => {
				const buffer = await file.arrayBuffer();
				const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
				return (await api("admin/upload", {
					method: "POST",
					body: JSON.stringify({
						filename: file.name,
						mime: file.type,
						data: base64
					})
				})).url;
			}));
			setForm((current) => ({
				...current,
				images: [...current.images, ...additions]
			}));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "图片上传失败");
		} finally {
			setBusy(false);
		}
	}
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "admin-gate",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			href: "/washjoy/",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowLeft, { size: 17 }), "返回地图"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ShieldCheck, { size: 30 }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: error || "管理员验证中" }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/washjoy/account/",
				children: "前往登录"
			})
		] })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "admin-app",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "admin-topbar",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: "/washjoy/",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowLeft, { size: 17 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Washjoy" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "门店管理" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "admin-user",
					children: user.profile?.displayName || user.phone
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "admin-layout",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: `admin-list ${mobileEdit ? "hide-mobile" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "admin-list-head",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "南京门店" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [places.length, " 家"] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => void create(),
							"aria-label": "新建门店",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Plus, { size: 17 })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "admin-search",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Search, { size: 15 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: search,
							onChange: (event) => setSearch(event.target.value),
							placeholder: "搜索门店"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "admin-tabs",
						children: [
							"basic",
							"images",
							"reviews",
							"trash"
						].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: tab === item ? "active" : "",
							onClick: () => {
								setTab(item);
								if (item === "trash") loadTrash();
							},
							children: {
								basic: "门店",
								images: "编辑",
								reviews: "评价",
								trash: "回收站"
							}[item]
						}, item))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "admin-place-list",
						children: [(tab === "trash" ? trash : visible).map((place) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: `admin-place-option ${place.id === selectedId ? "active" : ""}`,
							onClick: () => {
								if (tab === "trash") {
									restore(place);
									return;
								}
								setSelectedId(place.id);
								setForm({ ...place });
								setMobileEdit(true);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: place.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								place.category,
								" · ",
								place.area || place.address
							] })] }), tab === "trash" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.RotateCcw, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ChevronRight, { size: 16 })]
						}, place.id)), !visible.length && tab !== "trash" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "admin-empty",
							children: "没有匹配门店"
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: `admin-editor ${mobileEdit ? "show-mobile" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "editor-heading",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "mobile-back",
								onClick: () => setMobileEdit(false),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowLeft, { size: 17 }), "列表"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: form.category || "门店" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: form.name || "选择门店" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "editor-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "delete-action",
									onClick: () => void remove(form),
									disabled: !selectedId || busy,
									"aria-label": "移入回收站",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Trash2, { size: 16 })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "save-action",
									onClick: () => void save(),
									disabled: !selectedId || busy,
									children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LoaderCircle, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Save, { size: 16 }), "保存"]
								})]
							})
						]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "admin-alert",
						role: "alert",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.CircleAlert, { size: 15 }), error]
					}),
					message && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "admin-success",
						role: "status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Check, { size: 15 }), message]
					}),
					tab === "trash" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "admin-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "回收站" }), trash.map((place) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "trash-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: place.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => void restore(place),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.RotateCcw, { size: 15 }), "恢复"]
							})]
						}, place.id))]
					}) : tab === "reviews" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "admin-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "门店评价" }), reviews.map((review) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "admin-review",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: review.placeName }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"★".repeat(review.rating),
									" · ",
									review.author
								] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: review.text }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: async () => {
										if (window.confirm("删除这条评价？")) {
											await api(`admin/reviews/${review.id}`, { method: "DELETE" });
											await loadReviews();
										}
									},
									"aria-label": "删除评价",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Trash2, { size: 14 })
								})
							]
						}, review.id))]
					}) : tab === "images" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "admin-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "门店图片" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "upload-drop",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ImagePlus, { size: 23 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "选择图片上传" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "file",
										accept: "image/*",
										multiple: true,
										onChange: (event) => void uploadImages(event.target.files)
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "admin-images",
								children: form.images.map((url, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: url,
									alt: ""
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setForm({
										...form,
										images: form.images.filter((_, i) => i !== index)
									}),
									"aria-label": "移除图片",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Trash2, { size: 13 })
								})] }, `${url}-${index}`))
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: "admin-panel",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "admin-field-grid",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["门店名称", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: form.name,
									onChange: (event) => setForm({
										...form,
										name: event.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["门店分类", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: form.category,
									onChange: (event) => setForm({
										...form,
										category: event.target.value
									}),
									children: [
										"洗浴中心",
										"大众澡堂",
										"足疗会所",
										"街边店",
										"私汤"
									].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: item }, item))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["区域", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: form.area,
									onChange: (event) => setForm({
										...form,
										area: event.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["联系电话", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: form.phone,
									onChange: (event) => setForm({
										...form,
										phone: event.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["人均价格", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: form.price,
									onChange: (event) => setForm({
										...form,
										price: event.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["营业时间", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: form.openTime,
									onChange: (event) => setForm({
										...form,
										openTime: event.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "full",
									children: ["地址", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: form.address,
										onChange: (event) => setForm({
											...form,
											address: event.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "full",
									children: ["经纬度", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: form.location,
										onChange: (event) => setForm({
											...form,
											location: event.target.value
										}),
										placeholder: "经度,纬度"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "full",
									children: ["服务介绍", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: form.services,
										onChange: (event) => setForm({
											...form,
											services: event.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "full",
									children: ["详细介绍", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: form.description,
										onChange: (event) => setForm({
											...form,
											description: event.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "toggle-field",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: form.recommended,
										onChange: (event) => setForm({
											...form,
											recommended: event.target.checked
										})
									}), "站长推荐"]
								})
							]
						})
					})
				]
			})]
		})]
	});
}
export { Admin as component };
