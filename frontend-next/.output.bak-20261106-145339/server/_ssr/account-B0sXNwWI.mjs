import { i as __toESM } from "../_runtime.mjs";
import { t as NavBar } from "./nav-bar-B7EWZSFf.mjs";
import { i as TabBar, n as Icon, r as Segmented, t as Button$1 } from "./segmented-BKUUGHfR.mjs";
import { a as getSession, n as appUrl, t as api } from "./api-BQyxYK3H.mjs";
import { C as require_react, w as require_jsx_runtime } from "../_libs/@base-ui/react+[...].mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/account-B0sXNwWI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
function ListGroup({ children, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "wj-group",
		children: [label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "wj-group-label wj-footnote wj-secondary",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "wj-group-body",
			children
		})]
	});
}
function ListRow({ icon, title, detail, href, onClick, destructive, disabled, trailing }) {
	const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "wj-row-icon",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon,
				size: "md"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "wj-list-text",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-body",
				children: title
			}), detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "wj-footnote wj-secondary",
				children: detail
			})]
		}),
		trailing ?? (href || onClick ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "wj-chevron",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				icon: import_lucide_react.ChevronRight,
				size: "sm"
			})
		}) : null)
	] });
	const cls = `wj-list-row${destructive ? " is-destructive" : ""}`;
	if (href) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		className: cls,
		href,
		children: body
	});
	if (onClick) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: cls,
		onClick,
		disabled,
		children: body
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cls,
		children: body
	});
}
function Account() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [mode, setMode] = (0, import_react.useState)("login");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [displayName, setDisplayName] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [returnPlace, setReturnPlace] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setReturnPlace(new URLSearchParams(window.location.search).get("returnPlace") || "");
		getSession().then((session) => {
			setUser(session);
			setReady(true);
		});
	}, []);
	async function authenticate(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const result = await api(mode === "login" ? "auth/login" : "auth/register", {
				method: "POST",
				body: JSON.stringify(mode === "login" ? {
					phone,
					password
				} : {
					phone,
					password,
					displayName
				})
			});
			setUser(result.user);
			if (returnPlace) window.location.assign(`${appUrl()}?place=${encodeURIComponent(returnPlace)}`);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "网络暂时不可用");
		} finally {
			setBusy(false);
		}
	}
	async function logout() {
		setBusy(true);
		setError("");
		try {
			await api("auth/logout", { method: "POST" });
			setUser(null);
			setPassword("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "退出失败");
		} finally {
			setBusy(false);
		}
	}
	const title = user ? "我的" : mode === "login" ? "欢迎回来" : "创建账户";
	const name = user?.profile?.displayName || "Washjoy 用户";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "wj-app wj-page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavBar, { title }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "wj-page-inner",
				children: !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "wj-footnote wj-secondary wj-note",
					role: "status",
					children: "正在恢复登录状态…"
				}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "wj-profile",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wj-avatar",
							"aria-hidden": "true",
							children: name.slice(0, 1)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "wj-headline",
							children: name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "wj-footnote wj-secondary",
							children: user.phone
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ListGroup, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, {
							icon: import_lucide_react.Heart,
							title: "我的收藏",
							href: appUrl("mine/")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, {
							icon: import_lucide_react.MessageSquareText,
							title: "我的评价",
							href: `${appUrl("mine/")}?tab=reviews`
						}),
						user.role === "admin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, {
							icon: import_lucide_react.Settings,
							title: "门店管理",
							href: appUrl("admin/")
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListGroup, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListRow, {
						icon: import_lucide_react.LogOut,
						title: busy ? "正在退出…" : "退出登录",
						onClick: () => void logout(),
						disabled: busy,
						destructive: true
					}) }),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "wj-footnote wj-danger wj-form-error",
						role: "alert",
						children: error
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "wj-form",
					onSubmit: authenticate,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "wj-subhead wj-secondary wj-note",
							children: mode === "login" ? "登录后管理收藏与评价" : "注册后即可收藏门店并发布评价"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
							label: "登录或注册",
							value: mode,
							onChange: (next) => {
								setMode(next);
								setError("");
							},
							options: [{
								value: "login",
								label: "登录"
							}, {
								value: "register",
								label: "注册"
							}]
						}),
						mode === "register" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "wj-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "wj-footnote wj-secondary",
								children: "昵称"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wj-input-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									icon: import_lucide_react.UserRound,
									size: "md"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									autoComplete: "nickname",
									value: displayName,
									onChange: (event) => setDisplayName(event.target.value),
									maxLength: 40,
									required: true,
									placeholder: "最多 40 个字符"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "wj-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "wj-footnote wj-secondary",
								children: "手机号"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wj-input-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									icon: import_lucide_react.Phone,
									size: "md"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									autoComplete: "tel",
									inputMode: "tel",
									value: phone,
									onChange: (event) => setPhone(event.target.value),
									minLength: 11,
									maxLength: 11,
									pattern: "1[3-9][0-9]{9}",
									required: true,
									placeholder: "请输入手机号"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "wj-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "wj-footnote wj-secondary",
								children: "密码"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "wj-input-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									icon: import_lucide_react.LockKeyhole,
									size: "md"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									autoComplete: mode === "login" ? "current-password" : "new-password",
									type: "password",
									value: password,
									onChange: (event) => setPassword(event.target.value),
									minLength: 10,
									maxLength: 128,
									required: true,
									placeholder: mode === "register" ? "10–128 个字符" : "请输入密码"
								})]
							})]
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "wj-footnote wj-danger wj-form-error",
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button$1, {
							type: "submit",
							variant: "primary",
							loading: busy,
							children: mode === "login" ? "登录" : "注册并登录"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "wj-caption wj-secondary wj-note",
							children: "密码仅发送给 Washjoy API，由服务端安全处理"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabBar, { active: "me" })
		]
	});
}
export { Account as component };
