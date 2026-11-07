import { i as __toESM } from "../_runtime.mjs";
import { i as getSession, n as appUrl, t as api } from "./api-DyeFQMCW.mjs";
import { i as require_react, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as require_lucide_react } from "../_libs/lucide-react.mjs";
// node_modules/.nitro/vite/services/ssr/assets/account-COXWAewJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lucide_react = require_lucide_react();
function Account() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [mode, setMode] = (0, import_react.useState)("login");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [displayName, setDisplayName] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [returnPlace, setReturnPlace] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setReturnPlace(new URLSearchParams(window.location.search).get("returnPlace") || "");
		getSession().then(setUser);
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "account-page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			className: "back-link",
			href: "/washjoy/",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowLeft, { size: 17 }), "返回地图"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "account-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "account-brand",
				children: "Washjoy"
			}), user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "账户信息" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "登录状态已恢复" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "account-user",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.UserRound, { size: 20 }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: user.profile?.displayName || "Washjoy 用户" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: user.phone })] }),
						user.role === "admin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/washjoy/admin/",
							children: "管理"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "logout-button",
					disabled: busy,
					onClick: () => void logout(),
					children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LoaderCircle, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LogOut, { size: 16 }), "退出登录"]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "form-error",
					role: "alert",
					children: error
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: mode === "login" ? "欢迎回来" : "创建账户" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: mode === "login" ? "登录后管理收藏与评价" : "注册后即可收藏门店并发布评价" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "account-mode",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: mode === "login" ? "active" : "",
						onClick: () => {
							setMode("login");
							setError("");
						},
						children: "登录"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: mode === "register" ? "active" : "",
						onClick: () => {
							setMode("register");
							setError("");
						},
						children: "注册"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: authenticate,
					children: [
						mode === "register" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["昵称", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.UserRound, { size: 16 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoComplete: "nickname",
							value: displayName,
							onChange: (event) => setDisplayName(event.target.value),
							maxLength: 40,
							required: true,
							placeholder: "最多 40 个字符"
						})] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["手机号", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Phone, { size: 16 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoComplete: "tel",
							inputMode: "tel",
							value: phone,
							onChange: (event) => setPhone(event.target.value),
							minLength: 11,
							maxLength: 11,
							pattern: "1[3-9][0-9]{9}",
							required: true,
							placeholder: "请输入手机号"
						})] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["密码", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LockKeyhole, { size: 16 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoComplete: mode === "login" ? "current-password" : "new-password",
							type: "password",
							value: password,
							onChange: (event) => setPassword(event.target.value),
							minLength: 10,
							maxLength: 128,
							required: true,
							placeholder: mode === "register" ? "10–128 个字符" : "请输入密码"
						})] })] }),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "form-error",
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							disabled: busy,
							children: [
								busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.LoaderCircle, { size: 16 }),
								" ",
								mode === "login" ? "登录" : "注册并登录"
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "密码仅发送给 Washjoy API，由服务端安全处理" })
			] })]
		})]
	});
}
export { Account as component };
