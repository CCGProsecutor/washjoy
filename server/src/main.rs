use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path as AxPath, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
};
use base64::{Engine, engine::general_purpose::STANDARD};
use rand::{RngCore, rngs::OsRng};
use rusqlite::{Connection, OptionalExtension, params};
use scrypt::{
    Scrypt,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    env, fs,
    path::PathBuf,
    process::Stdio,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::process::Command;
#[derive(Clone)]
struct S {
    db: Arc<Mutex<Connection>>,
    admin: String,
    data: PathBuf,
    uploads: PathBuf,
    oss: String,
    prefix: String,
    base: String,
}
#[derive(Serialize)]
struct E {
    error: String,
}
#[derive(Debug)]
struct ApiError(StatusCode, String);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(E { error: self.1 })).into_response()
    }
}
type R<T> = Result<T, ApiError>;
fn e(c: StatusCode, s: impl Into<String>) -> ApiError {
    ApiError(c, s.into())
}
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
fn conn(s: &S) -> R<std::sync::MutexGuard<'_, Connection>> {
    s.db.lock()
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "数据库不可用"))
}
fn snapshot_db(s: &S) {
    let Ok(_db) = s.db.lock() else {
        return;
    };
    let dir = s.data.join("snapshots");
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    if fs::copy(
        s.data.join("washjoy.sqlite3"),
        dir.join(format!("washjoy-{stamp}.sqlite3")),
    )
    .is_err()
    {
        return;
    }
    let mut files = fs::read_dir(&dir)
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .collect::<Vec<_>>();
    files.sort_by_key(|x| x.file_name());
    let excess = files.len().saturating_sub(30);
    for old in files.into_iter().take(excess) {
        let _ = fs::remove_file(old.path());
    }
}
fn valid_phone(p: &str) -> bool {
    p.len() == 11 && p.starts_with('1') && p.bytes().all(|x| x.is_ascii_digit())
}
fn token() -> String {
    let mut b = [0u8; 32];
    OsRng.fill_bytes(&mut b);
    hex::encode(b)
}
fn thash(t: &str) -> String {
    hex::encode(Sha256::digest(t.as_bytes()))
}
fn pass_hash(p: &str) -> R<String> {
    Scrypt
        .hash_password(p.as_bytes(), &SaltString::generate(&mut OsRng))
        .map(|x| x.to_string())
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "密码处理失败"))
}
#[derive(Deserialize)]
struct Register {
    phone: String,
    password: String,
    #[serde(default)]
    display_name: String,
}
#[derive(Deserialize)]
struct Login {
    phone: String,
    password: String,
}
#[derive(Deserialize)]
struct Profile {
    #[serde(default)]
    display_name: String,
}
#[derive(Deserialize)]
struct City {
    city: String,
}
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Place {
    id: Option<String>,
    city: String,
    name: String,
    category: String,
    #[serde(default)]
    area: String,
    #[serde(default)]
    address: String,
    #[serde(default)]
    phone: String,
    #[serde(default)]
    price: String,
    #[serde(default)]
    rating: String,
    #[serde(default)]
    open_time: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    services: String,
    #[serde(default)]
    images: Vec<String>,
    #[serde(default)]
    techs: Vec<Value>,
    #[serde(default)]
    location: String,
    #[serde(default)]
    recommended: bool,
}
fn cookie(t: &str) -> HeaderValue {
    HeaderValue::from_str(&format!(
        "washjoy_session={t}; Path=/washjoy/api; HttpOnly; Secure; SameSite=Strict; Max-Age=43200"
    ))
    .unwrap()
}
fn respond<T: Serialize>(code: StatusCode, x: T, c: Option<HeaderValue>) -> Response {
    let mut r = (code, Json(x)).into_response();
    r.headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    if let Some(c) = c {
        r.headers_mut().insert(header::SET_COOKIE, c);
    }
    r
}
#[derive(Serialize)]
struct User {
    phone: String,
    role: String,
    profile: Value,
    created_at: i64,
}
fn auth(s: &S, h: &HeaderMap) -> R<User> {
    let raw = h
        .get(header::COOKIE)
        .and_then(|x| x.to_str().ok())
        .unwrap_or("");
    let t = raw
        .split(';')
        .map(str::trim)
        .find_map(|x| x.strip_prefix("washjoy_session="))
        .ok_or_else(|| e(StatusCode::UNAUTHORIZED, "请先登录"))?;
    let d = conn(s)?;
    let row=d.query_row("SELECT u.phone,u.role,u.profile,u.created,se.expires FROM sessions se JOIN users u ON u.phone=se.phone WHERE se.token_hash=?",params![thash(t)],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,i64>(3)?,r.get::<_,i64>(4)?))).optional().map_err(|_|e(StatusCode::INTERNAL_SERVER_ERROR,"登录状态读取失败"))?.ok_or_else(||e(StatusCode::UNAUTHORIZED,"登录状态已失效"))?;
    if row.4 < now() {
        d.execute("DELETE FROM sessions WHERE token_hash=?", params![thash(t)])
            .ok();
        return Err(e(StatusCode::UNAUTHORIZED, "登录已过期"));
    }
    Ok(User {
        phone: row.0,
        role: row.1,
        profile: serde_json::from_str(&row.2).unwrap_or(json!({})),
        created_at: row.3,
    })
}
fn admin(s: &S, h: &HeaderMap) -> R<User> {
    let u = auth(s, h)?;
    if u.role != "admin" {
        return Err(e(StatusCode::FORBIDDEN, "需要管理员权限"));
    }
    Ok(u)
}
fn city_name(c: &str) -> &str {
    match c {
        "nanjing" => "南京市",
        "yangzhou" => "扬州市",
        "zhenjiang" => "镇江市",
        _ => c,
    }
}
fn src(c: &str) -> Option<PathBuf> {
    let slug = match c {
        "南京市" | "nanjing" => "nanjing",
        "扬州市" | "yangzhou" => "yangzhou",
        "镇江市" | "zhenjiang" => "zhenjiang",
        _ => return None,
    };
    let dir = env::var("WASHJOY_STORE_DIR")
        .unwrap_or_else(|_| "/var/www/html/washjoy/data".into());
    Some(PathBuf::from(format!("{dir}/{slug}.json")))
}
async fn health() -> Json<Value> {
    Json(json!({"ok":true,"service":"washjoy-api-rust"}))
}
async fn register(State(s): State<S>, h: HeaderMap, Json(b): Json<Register>) -> R<Response> {
    let p = b.phone.trim();
    if !valid_phone(p) {
        return Err(e(StatusCode::BAD_REQUEST, "请输入有效手机号"));
    }
    if b.password.len() < 10 || b.password.len() > 128 {
        return Err(e(StatusCode::BAD_REQUEST, "密码长度需为10至128位"));
    }
    let ip = h
        .get("x-real-ip")
        .or_else(|| h.get("x-forwarded-for"))
        .and_then(|x| x.to_str().ok())
        .unwrap_or("unknown")
        .split(',')
        .next()
        .unwrap_or("unknown")
        .trim();
    let t = now();
    let profile = json!({"displayName":b.display_name.trim().chars().take(40).collect::<String>()});
    let role = if p == s.admin { "admin" } else { "user" };
    let tk = token();
    let db = conn(&s)?;
    let tx = db
        .unchecked_transaction()
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "数据库不可用"))?;
    let last: Option<i64> = tx
        .query_row("SELECT at FROM reg_limit WHERE ip=?", params![ip], |r| {
            r.get(0)
        })
        .optional()
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "限流检查失败"))?;
    if let Some(last) = last {
        if t - last < 30 {
            return Err(e(
                StatusCode::TOO_MANY_REQUESTS,
                format!("每个 IP 注册间隔 30 秒，请{}秒后重试", 30 - (t - last)),
            ));
        }
    }
    let exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE phone=?)",
            params![p],
            |r| r.get(0),
        )
        .unwrap_or(false);
    if exists {
        return Err(e(StatusCode::CONFLICT, "手机号已注册"));
    }
    let hash = pass_hash(&b.password)?;
    tx.execute(
        "INSERT INTO reg_limit(ip,at) VALUES(?,?) ON CONFLICT(ip) DO UPDATE SET at=excluded.at",
        params![ip, t],
    )
    .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "限流状态保存失败"))?;
    tx.execute(
        "INSERT INTO users(phone,pass,role,profile,created) VALUES(?,?,?,?,?)",
        params![p, hash, role, profile.to_string(), t],
    )
    .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "注册信息保存失败"))?;
    tx.execute(
        "INSERT INTO sessions(token_hash,phone,expires) VALUES(?,?,?)",
        params![thash(&tk), p, t + 43200],
    )
    .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "登录状态保存失败"))?;
    tx.commit()
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "注册信息保存失败"))?;
    Ok(respond(
        StatusCode::CREATED,
        json!({"user":{"phone":p,"role":role,"profile":profile,"createdAt":t}}),
        Some(cookie(&tk)),
    ))
}
fn record_login_failure(db: &Connection, key: &str, t: i64) {
    db.execute(
        "INSERT INTO login_fail(k,attempts,locked) VALUES(?,1,0) ON CONFLICT(k) DO UPDATE SET attempts=attempts+1,locked=CASE WHEN attempts+1>=8 THEN ? ELSE locked END",
        params![key, t + 900],
    ).ok();
}
async fn login(State(s): State<S>, h: HeaderMap, Json(b): Json<Login>) -> R<Response> {
    let p = b.phone.trim();
    let ip = h
        .get("x-real-ip")
        .and_then(|x| x.to_str().ok())
        .unwrap_or("unknown");
    let key = format!("{ip}:{p}");
    let t = now();
    let db = conn(&s)?;
    let fail: Option<(i64, i64)> = db
        .query_row(
            "SELECT attempts,locked FROM login_fail WHERE k=?",
            params![key],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "登录状态读取失败"))?;
    if fail.is_some_and(|x| x.1 > t) {
        return Err(e(
            StatusCode::TOO_MANY_REQUESTS,
            "登录错误过多，请15分钟后重试",
        ));
    }
    let row: Option<(String, String, String, i64)> = db
        .query_row(
            "SELECT pass,role,profile,created FROM users WHERE phone=?",
            params![p],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .optional()
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "账户读取失败"))?;
    let Some((stored, role, profile, created)) = row else {
        record_login_failure(&db, &key, t);
        return Err(e(StatusCode::UNAUTHORIZED, "手机号或密码错误"));
    };
    let parsed = PasswordHash::new(&stored)
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "账户凭据错误"))?;
    if Scrypt
        .verify_password(b.password.as_bytes(), &parsed)
        .is_err()
    {
        record_login_failure(&db, &key, t);
        return Err(e(StatusCode::UNAUTHORIZED, "手机号或密码错误"));
    }
    db.execute("DELETE FROM login_fail WHERE k=?", params![key])
        .ok();
    let tk = token();
    db.execute(
        "INSERT INTO sessions(token_hash,phone,expires) VALUES(?,?,?)",
        params![thash(&tk), p, t + 43200],
    )
    .map_err(|err| { eprintln!("session insert failed: {err}"); e(StatusCode::INTERNAL_SERVER_ERROR, "创建会话失败") })?;
    Ok(respond(
        StatusCode::OK,
        json!({"user":{"phone":p,"role":role,"profile":serde_json::from_str::<Value>(&profile).unwrap_or(json!({})),"createdAt":created}}),
        Some(cookie(&tk)),
    ))
}
async fn me(State(s): State<S>, h: HeaderMap) -> R<Json<Value>> {
    let u = auth(&s, &h)?;
    Ok(Json(
        json!({"phone":u.phone,"role":u.role,"profile":u.profile,"createdAt":u.created_at}),
    ))
}
async fn logout(State(s): State<S>, h: HeaderMap) -> Response {
    if let Some(t) = h
        .get(header::COOKIE)
        .and_then(|x| x.to_str().ok())
        .unwrap_or("")
        .split(';')
        .map(str::trim)
        .find_map(|x| x.strip_prefix("washjoy_session="))
    {
        if let Ok(d) = s.db.lock() {
            d.execute("DELETE FROM sessions WHERE token_hash=?", params![thash(t)])
                .ok();
        }
    }
    respond(
        StatusCode::OK,
        json!({"ok":true}),
        Some(HeaderValue::from_static(
            "washjoy_session=; Path=/washjoy/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
        )),
    )
}
async fn profile(State(s): State<S>, h: HeaderMap, Json(b): Json<Profile>) -> R<Json<Value>> {
    let u = auth(&s, &h)?;
    let p = json!({"displayName":b.display_name.trim().chars().take(40).collect::<String>()});
    conn(&s)?
        .execute(
            "UPDATE users SET profile=? WHERE phone=?",
            params![p.to_string(), u.phone],
        )
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "资料保存失败"))?;
    Ok(Json(json!({"profile":p})))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReviewIn {
    place_id: String,
    city: String,
    rating: i64,
    text: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReviewQuery {
    place_id: Option<String>,
    city: Option<String>,
}
fn mask_phone(p: &str) -> String {
    if p.len() == 11 {
        format!("{}****{}", &p[..3], &p[7..])
    } else {
        p.to_string()
    }
}
async fn add_review(State(s): State<S>, h: HeaderMap, Json(b): Json<ReviewIn>) -> R<Json<Value>> {
    let u = auth(&s, &h)?;
    let text = b.text.trim();
    if !(1..=5).contains(&b.rating) {
        return Err(e(StatusCode::BAD_REQUEST, "评分需在 1-5 星之间"));
    }
    if text.is_empty() || text.chars().count() > 500 {
        return Err(e(StatusCode::BAD_REQUEST, "评价内容需为 1-500 字"));
    }
    let name = merged(&s, &b.city)?
        .get("pois")
        .and_then(|a| a.as_array())
        .and_then(|a| a.iter().find(|x| x["id"] == b.place_id))
        .and_then(|x| x["name"].as_str().map(str::to_owned))
        .ok_or_else(|| e(StatusCode::NOT_FOUND, "门店不存在"))?;
    let created = now();
    let db = conn(&s)?;
    db.execute(
        "INSERT INTO reviews(place_id,place_name,city,phone,rating,text,created)VALUES(?,?,?,?,?,?,?)",
        params![b.place_id, name, city_name(&b.city), u.phone, b.rating, text, created],
    )
    .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价保存失败"))?;
    let id = db.last_insert_rowid();
    Ok(Json(
        json!({"ok":true,"review":{"id":id,"rating":b.rating,"text":text,"author":mask_phone(&u.phone),"placeName":name,"created":created}}),
    ))
}
async fn place_reviews(State(s): State<S>, Query(q): Query<ReviewQuery>) -> R<Json<Value>> {
    let pid = q
        .place_id
        .ok_or_else(|| e(StatusCode::BAD_REQUEST, "缺少门店参数"))?;
    let db = conn(&s)?;
    let avg: (f64, i64) = db
        .query_row(
            "SELECT COALESCE(AVG(rating),0),COUNT(*) FROM reviews WHERE place_id=?",
            params![pid],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let mut st = db
        .prepare("SELECT id,rating,text,phone,created,place_name FROM reviews WHERE place_id=? ORDER BY id DESC LIMIT 50")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let rows = st
        .query_map(params![pid], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, i64>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, i64>(4)?,
                r.get::<_, String>(5)?,
            ))
        })
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let mut list = Vec::new();
    for x in rows {
        let (id, rating, text, phone, created, place) =
            x.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
        list.push(json!({"id":id,"rating":rating,"text":text,"author":mask_phone(&phone),"created":created,"placeName":place}));
    }
    let average = (avg.0 * 10.0).round() / 10.0;
    Ok(Json(
        json!({"reviews":list,"average":average,"count":avg.1}),
    ))
}
async fn my_reviews(State(s): State<S>, h: HeaderMap) -> R<Json<Value>> {
    let u = auth(&s, &h)?;
    let db = conn(&s)?;
    let mut st = db
        .prepare("SELECT id,place_id,place_name,rating,text,created FROM reviews WHERE phone=? ORDER BY id DESC LIMIT 100")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let rows = st
        .query_map(params![u.phone], |r| {
            Ok(json!({"id":r.get::<_,i64>(0)?,"placeId":r.get::<_,String>(1)?,"placeName":r.get::<_,String>(2)?,"rating":r.get::<_,i64>(3)?,"text":r.get::<_,String>(4)?,"created":r.get::<_,i64>(5)?}))
        })
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let list: Vec<Value> = rows.flatten().collect();
    Ok(Json(json!({"reviews":list})))
}
async fn admin_reviews(
    State(s): State<S>,
    h: HeaderMap,
    Query(q): Query<ReviewQuery>,
) -> R<Json<Value>> {
    admin(&s, &h)?;
    let db = conn(&s)?;
    let mut sql = String::from(
        "SELECT id,place_id,place_name,rating,text,phone,created,city FROM reviews WHERE 1=1",
    );
    if q.place_id.is_some() {
        sql.push_str(" AND place_id=?");
    }
    if q.city.is_some() {
        sql.push_str(" AND city=?");
    }
    sql.push_str(" ORDER BY id DESC LIMIT 300");
    let mut st = db
        .prepare(&sql)
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let mut args: Vec<String> = Vec::new();
    if let Some(p) = &q.place_id {
        args.push(p.clone());
    }
    if let Some(c) = &q.city {
        args.push(city_name(c).to_string());
    }
    let refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|x| x as &dyn rusqlite::ToSql).collect();
    let rows = st
        .query_map(refs.as_slice(), |r| {
            Ok(json!({"id":r.get::<_,i64>(0)?,"placeId":r.get::<_,String>(1)?,"placeName":r.get::<_,String>(2)?,"rating":r.get::<_,i64>(3)?,"text":r.get::<_,String>(4)?,"phone":mask_phone(&r.get::<_,String>(5)?),"created":r.get::<_,i64>(6)?,"city":r.get::<_,String>(7)?}))
        })
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价读取失败"))?;
    let list: Vec<Value> = rows.flatten().collect();
    Ok(Json(json!({"reviews":list})))
}
async fn delete_review(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<i64>,
) -> R<Json<Value>> {
    admin(&s, &h)?;
    let n = conn(&s)?
        .execute("DELETE FROM reviews WHERE id=?", params![id])
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价删除失败"))?;
    if n == 0 {
        return Err(e(StatusCode::NOT_FOUND, "评价不存在"));
    }
    Ok(Json(json!({"ok":true})))
}
fn merged(s: &S, city: &str) -> R<Value> {
    let file = src(city_name(city)).ok_or_else(|| e(StatusCode::NOT_FOUND, "城市不存在"))?;
    let mut data: Value = serde_json::from_slice(
        &fs::read(file)
            .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "基础门店数据读取失败"))?,
    )
    .map_err(|x| e(StatusCode::INTERNAL_SERVER_ERROR, x.to_string()))?;
    let db = conn(s)?;
    let mut q = db
        .prepare("SELECT id,category,data,deleted,updated FROM store_overrides WHERE city=?")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "人工覆盖读取失败"))?;
    let rows = q
        .query_map(params![city_name(city)], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, i64>(3)?,
                r.get::<_, i64>(4)?,
            ))
        })
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "人工覆盖读取失败"))?;
    let mut edits = std::collections::HashMap::new();
    for x in rows {
        let (id, c, v, d, updated) =
            x.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "人工覆盖读取失败"))?;
        edits.insert(
            id,
            (
                c,
                serde_json::from_str::<Value>(&v).unwrap_or(json!({})),
                d != 0,
                updated,
            ),
        );
    }
    let arr = data["pois"]
        .as_array_mut()
        .ok_or_else(|| e(StatusCode::INTERNAL_SERVER_ERROR, "高德数据格式无效"))?;
    arr.retain_mut(|p| {
        let id = p["id"].as_str().unwrap_or("").to_string();
        if let Some((cat, fields, deleted, updated)) = edits.get(&id) {
            if *deleted {
                return false;
            }
            if let (Some(dst), Some(src)) = (p.as_object_mut(), fields.as_object()) {
                for (k, v) in src {
                    dst.insert(k.clone(), v.clone());
                }
            }
            p["adminCategory"] = json!(cat);
            p["adminManaged"] = json!(true);
            p["adminUpdatedAt"] = json!(updated);
        }
        true
    });
    let mut q = db
        .prepare(
            "SELECT id,category,data,updated FROM store_overrides WHERE city=? AND manual=1 AND deleted=0",
        )
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "手工门店读取失败"))?;
    let rows = q
        .query_map(params![city_name(city)], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, i64>(3)?,
            ))
        })
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "手工门店读取失败"))?;
    for x in rows {
        let (id, cat, v, updated) =
            x.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "手工门店读取失败"))?;
        let mut p: Value = serde_json::from_str(&v).unwrap_or(json!({}));
        p["id"] = json!(id);
        p["adminCategory"] = json!(cat);
        p["manual"] = json!(true);
        p["adminUpdatedAt"] = json!(updated);
        arr.push(p)
    }
    {
        if let Ok(mut q) =
            db.prepare("SELECT place_id,COUNT(*),AVG(rating) FROM reviews GROUP BY place_id")
        {
            if let Ok(rows) = q.query_map([], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, f64>(2)?,
                ))
            }) {
                let mut map = std::collections::HashMap::new();
                for row in rows.flatten() {
                    map.insert(row.0, (row.1, row.2));
                }
                if let Some(arr) = data["pois"].as_array_mut() {
                    for p in arr.iter_mut() {
                        if let Some(id) = p["id"].as_str() {
                            if let Some((count, avg)) = map.get(id) {
                                p["reviewCount"] = json!(count);
                                p["reviewRating"] = json!(((avg * 10.0).round()) / 10.0);
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(data)
}
async fn public_data(State(s): State<S>, Query(c): Query<City>) -> R<Response> {
    Ok(respond(StatusCode::OK, merged(&s, &c.city)?, None))
}
fn value_text(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Array(items) => items
            .iter()
            .map(value_text)
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join(", "),
        _ => String::new(),
    }
}
fn inferred_admin_category(p: &Value) -> &'static str {
    let name = p["name"].as_str().unwrap_or("");
    let kind = p["type"].as_str().unwrap_or("");
    let text = format!("{name} {kind}");
    let cost = p["biz_ext"]["cost"]
        .as_str()
        .or(p["cost"].as_str())
        .unwrap_or("")
        .parse::<f64>()
        .unwrap_or(0.0);
    if ["足疗", "足浴", "足道", "修脚", "足艺", "足保", "采耳"]
        .iter()
        .any(|word| text.contains(word))
    {
        if cost >= 130.0
            || ["连锁", "足道", "足艺", "会所", "养生"]
                .iter()
                .any(|word| text.contains(word))
        {
            "足疗会所"
        } else {
            "街边店"
        }
    } else if [
        "大众浴室",
        "大众浴池",
        "澡堂",
        "浴池",
        "浴室",
        "社区浴",
        "便民浴",
        "工人浴",
    ]
    .iter()
    .any(|word| text.contains(word))
        || (cost > 0.0 && cost < 80.0 && kind.contains("洗浴推拿场所"))
    {
        "大众澡堂"
    } else if ["洗浴", "温泉", "汤泉", "水会", "水汇", "汗蒸"]
        .iter()
        .any(|word| text.contains(word))
        && cost > 0.0
        && cost < 80.0
    {
        "大众澡堂"
    } else if ["街边店", "小店", "便民"]
        .iter()
        .any(|word| text.contains(word))
    {
        "街边店"
    } else {
        "洗浴中心"
    }
}
fn admin_row(p: &Value, city: &str) -> Value {
    let be = &p["biz_ext"];
    let raw_category = p["adminCategory"].as_str().unwrap_or("");
    let category = if ["洗浴中心", "大众澡堂", "足疗会所", "街边店", "私汤"].contains(&raw_category)
    {
        raw_category
    } else {
        inferred_admin_category(p)
    };
    let price = be["cost"]
        .as_str()
        .or(p["cost"].as_str())
        .map(str::to_owned)
        .unwrap_or_else(|| value_text(&be["cost"]));
    let rating = be["rating"]
        .as_str()
        .or(p["rating"].as_str())
        .map(str::to_owned)
        .unwrap_or_else(|| value_text(&be["rating"]));
    let open_time = be["open_time"]
        .as_str()
        .or(p["open_time"].as_str())
        .map(str::to_owned)
        .unwrap_or_else(|| value_text(&be["open_time"]));
    let services = p["services"]
        .as_str()
        .or(p["service_summary"].as_str())
        .unwrap_or("");
    let images = p["photos"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|x| x["url"].as_str().unwrap_or(""))
        .filter(|x| !x.is_empty())
        .collect::<Vec<_>>();
    let location = p["location"]
        .as_str()
        .map(str::to_owned)
        .unwrap_or_else(|| {
            format!(
                "{},{}",
                value_text(&p["location"]["lng"]),
                value_text(&p["location"]["lat"])
            )
        });
    json!({"id":p["id"],"city":city,"name":value_text(&p["name"]),"category":category,"type":p["type"],"address":value_text(&p["address"]),"area":value_text(&p["adname"]),"phone":value_text(&p["tel"]),"price":price,"rating":rating,"openTime":open_time,"description":value_text(&p["description"]),"services":services,"images":images,"techs":p["techs"].as_array().cloned().unwrap_or_default(),"location":location,"manual":p["manual"]==true,"recommended":p["recommended"]==true})
}
async fn admin_places(State(s): State<S>, h: HeaderMap, Query(c): Query<City>) -> R<Json<Value>> {
    admin(&s, &h)?;
    let d = merged(&s, &c.city)?;
    let rows = d["pois"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(|p| admin_row(p, city_name(&c.city)))
        .collect::<Vec<_>>();
    Ok(Json(json!({"places":rows})))
}
fn make_place(b: &Place, id: &str) -> R<Value> {
    if !["洗浴中心", "大众澡堂", "足疗会所", "街边店", "私汤"].contains(&b.category.as_str())
    {
        return Err(e(StatusCode::BAD_REQUEST, "门店分类无效"));
    }
    Ok(
        json!({"id":id,"name":b.name.trim(),"type":"生活服务;洗浴推拿场所;洗浴推拿场所","location":b.location,"address":b.address,"tel":b.phone,"adname":b.area,"photos":b.images.iter().filter(|x|x.starts_with("https://")).take(20).map(|u|json!({"url":u,"title":""})).collect::<Vec<_>>(),"biz_ext":{"cost":b.price,"rating":b.rating,"open_time":b.open_time},"description":b.description,"service_summary":b.services,"services":b.services,"techs":b.techs,"adminCategory":b.category,"recommended":b.recommended}),
    )
}
async fn save(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<String>,
    Json(b): Json<Place>,
) -> R<Json<Value>> {
    let u = admin(&s, &h)?;
    let city = city_name(&b.city);
    let d = merged(&s, &b.city)?;
    let exists = d["pois"]
        .as_array()
        .is_some_and(|a| a.iter().any(|x| x["id"] == id));
    let manual = id.starts_with("manual-");
    if !exists && !manual {
        return Err(e(StatusCode::NOT_FOUND, "门店不存在"));
    }
    let v = make_place(&b, &id)?;
    conn(&s)?.execute("INSERT INTO store_overrides(id,city,category,data,manual,deleted,updated,by_user)VALUES(?,?,?,?,?,0,?,?)ON CONFLICT(id)DO UPDATE SET city=excluded.city,category=excluded.category,data=excluded.data,manual=MAX(store_overrides.manual,excluded.manual),deleted=0,updated=excluded.updated,by_user=excluded.by_user",params![id,city,b.category,v.to_string(),manual as i64,now(),u.phone]).map_err(|err| { eprintln!("place save failed for {id}: {err}"); e(StatusCode::INTERNAL_SERVER_ERROR,"门店保存失败") })?;
    snapshot_db(&s);
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn create(State(s): State<S>, h: HeaderMap, Json(b): Json<Place>) -> R<Response> {
    admin(&s, &h)?;
    if b.name.trim().is_empty() {
        return Err(e(StatusCode::BAD_REQUEST, "门店名称必填"));
    }
    let id = format!("manual-{}", &token()[..18]);
    let v = make_place(&b, &id)?;
    let u = admin(&s, &h)?;
    conn(&s)?.execute("INSERT INTO store_overrides(id,city,category,data,manual,deleted,updated,by_user)VALUES(?,?,?,?,1,0,?,?)",params![id,city_name(&b.city),b.category,v.to_string(),now(),u.phone]).map_err(|_|e(StatusCode::INTERNAL_SERVER_ERROR,"手工门店保存失败"))?;
    snapshot_db(&s);
    Ok(respond(
        StatusCode::CREATED,
        json!({"ok":true,"id":id}),
        None,
    ))
}
async fn remove(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<String>,
    Query(c): Query<City>,
) -> R<Json<Value>> {
    let u = admin(&s, &h)?;
    let city = city_name(&c.city);
    let data = merged(&s, &c.city)?
        .get("pois")
        .and_then(|a| a.as_array())
        .and_then(|a| a.iter().find(|x| x["id"] == id).cloned())
        .or_else(|| {
            conn(&s)
                .ok()
                .and_then(|db| {
                    db.query_row(
                        "SELECT data FROM store_overrides WHERE id=? AND city=? AND deleted=1",
                        params![id, city],
                        |r| r.get::<_, String>(0),
                    )
                    .ok()
                })
                .and_then(|v| serde_json::from_str::<Value>(&v).ok())
        });
    let data = match data {
        Some(v) => v,
        None => return Err(e(StatusCode::NOT_FOUND, "门店不存在")),
    };
    let category = ["洗浴中心", "大众澡堂", "足疗会所", "街边店", "私汤"]
        .iter()
        .find(|x| data["adminCategory"].as_str() == Some(**x))
        .map(|x| x.to_string())
        .unwrap_or_else(|| "洗浴中心".to_string());
    let manual = id.starts_with("manual-");
    conn(&s)?
        .execute(
            "INSERT INTO store_overrides(id,city,category,data,manual,deleted,updated,by_user)VALUES(?,?,?,?,?,1,?,?)ON CONFLICT(id)DO UPDATE SET deleted=1,updated=excluded.updated,by_user=excluded.by_user",
            params![id, city, category, data.to_string(), manual as i64, now(), u.phone],
        )
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "删除失败"))?;
    snapshot_db(&s);
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn trash(State(s): State<S>, h: HeaderMap, Query(c): Query<City>) -> R<Json<Value>> {
    admin(&s, &h)?;
    let name = city_name(&c.city);
    let db = conn(&s)?;
    let mut q = db
        .prepare("SELECT id,data,updated,manual FROM store_overrides WHERE city=? AND deleted=1 ORDER BY updated DESC")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "回收站读取失败"))?;
    let rows = q
        .query_map(params![name], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, i64>(3)?,
            ))
        })
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "回收站读取失败"))?;
    let mut out = Vec::new();
    for row in rows {
        let (id, data, updated, manual) =
            row.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "回收站读取失败"))?;
        let v: Value = serde_json::from_str(&data).unwrap_or(json!({}));
        let mut item = admin_row(&v, name);
        item["id"] = json!(id);
        item["manual"] = json!(manual != 0);
        item["deletedAt"] = json!(updated);
        out.push(item);
    }
    Ok(Json(json!({"places":out})))
}
async fn restore(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<String>,
    Query(c): Query<City>,
) -> R<Json<Value>> {
    let u = admin(&s, &h)?;
    let n = conn(&s)?
        .execute(
            "UPDATE store_overrides SET deleted=0,updated=?,by_user=? WHERE id=? AND city=? AND deleted=1",
            params![now(), u.phone, id, city_name(&c.city)],
        )
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "恢复失败"))?;
    if n == 0 {
        return Err(e(StatusCode::NOT_FOUND, "回收站中没有这家门店"));
    }
    snapshot_db(&s);
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn purge(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<String>,
    Query(c): Query<City>,
) -> R<Json<Value>> {
    admin(&s, &h)?;
    let city = city_name(&c.city);
    if !id.starts_with("manual-") {
        return Err(e(
            StatusCode::BAD_REQUEST,
            "高德门店无法彻底删除，可恢复或保持隐藏",
        ));
    }
    let n = conn(&s)?
        .execute(
            "DELETE FROM store_overrides WHERE id=? AND city=? AND deleted=1",
            params![id, city],
        )
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "彻底删除失败"))?;
    if n == 0 {
        return Err(e(StatusCode::NOT_FOUND, "回收站中没有这家门店"));
    }
    snapshot_db(&s);
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn tags(State(s): State<S>, h: HeaderMap, Query(c): Query<City>) -> R<Json<Value>> {
    admin(&s, &h)?;
    let mut counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut push = |raw: &str| {
        for t in raw.split(['|', ',', '、', ';']) {
            let t = t.trim();
            if !t.is_empty() && t.chars().count() <= 24 {
                *counts.entry(t.to_string()).or_insert(0) += 1;
            }
        }
    };
    if let Ok(d) = merged(&s, &c.city) {
        if let Some(arr) = d["pois"].as_array() {
            for p in arr {
                for key in ["services", "service_summary"] {
                    if let Some(v) = p[key].as_str() {
                        push(v);
                    }
                }
            }
        }
    }
    if let Ok(db) = conn(&s) {
        if let Ok(mut q) = db.prepare("SELECT data FROM store_overrides WHERE city=?") {
            if let Ok(rows) = q.query_map(params![city_name(&c.city)], |r| r.get::<_, String>(0)) {
                for v in rows.flatten() {
                    if let Ok(p) = serde_json::from_str::<Value>(&v) {
                        for key in ["services", "service_summary"] {
                            if let Some(t) = p[key].as_str() {
                                push(t);
                            }
                        }
                    }
                }
            }
        }
    }
    let mut list: Vec<(String, i64)> = counts.into_iter().collect();
    list.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    let tags: Vec<String> = list.into_iter().take(80).map(|(t, _)| t).collect();
    Ok(Json(json!({"tags":tags})))
}
#[derive(Deserialize)]
struct Upload {
    mime: String,
    data: String,
}
async fn upload(State(s): State<S>, h: HeaderMap, Json(b): Json<Upload>) -> R<Response> {
    admin(&s, &h)?;
    let ext = match b.mime.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => return Err(e(StatusCode::BAD_REQUEST, "仅支持 JPG、PNG、WebP")),
    };
    let data = b.data.split_once(',').map(|x| x.1).unwrap_or(&b.data);
    let bytes = STANDARD
        .decode(data)
        .map_err(|_| e(StatusCode::BAD_REQUEST, "图片编码错误"))?;
    if bytes.is_empty() || bytes.len() > 8 * 1024 * 1024 {
        return Err(e(StatusCode::PAYLOAD_TOO_LARGE, "图片需小于8MB"));
    }
    let name = format!("{}.{}", &hex::encode(Sha256::digest(&bytes))[..32], ext);
    fs::create_dir_all(&s.uploads)
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "上传目录错误"))?;
    let local = s.uploads.join(&name);
    if !local.exists() {
        fs::write(&local, &bytes)
            .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "本地备份失败"))?;
        let out = Command::new("/usr/local/bin/aliyun")
            .args(["ossutil", "cp"])
            .arg(&local)
            .arg(format!("oss://{}/{}/{}", s.oss, s.prefix, name))
            .args([
                "--acl",
                "public-read",
                "--cache-control",
                "public, max-age=31536000, immutable",
                "--content-type",
                &b.mime,
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .output()
            .await
            .map_err(|_| e(StatusCode::BAD_GATEWAY, "OSS 上传工具不可用"))?;
        if !out.status.success() {
            return Err(e(
                StatusCode::BAD_GATEWAY,
                "图片已保存到服务器，OSS上传失败，请重试",
            ));
        }
    }
    Ok(respond(
        StatusCode::CREATED,
        json!({"url":format!("{}/{}",s.base.trim_end_matches('/'),name),"backup":"站点文件及加密GitHub备份"}),
        None,
    ))
}
#[tokio::main]
async fn main() {
    let data = PathBuf::from(
        env::var("WASHJOY_DATA_DIR").unwrap_or("/var/www/html/washjoy/private".into()),
    );
    let uploads = PathBuf::from(
        env::var("WASHJOY_UPLOAD_DIR").unwrap_or("/var/www/html/washjoy/uploads".into()),
    );
    fs::create_dir_all(&data).expect("data dir");
    fs::create_dir_all(&uploads).expect("upload dir");
    let db = Connection::open(data.join("washjoy.sqlite3")).expect("sqlite");
    db.execute_batch("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS users(phone TEXT PRIMARY KEY,pass TEXT NOT NULL,role TEXT NOT NULL,profile TEXT NOT NULL,created INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,phone TEXT NOT NULL,expires INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS reg_limit(ip TEXT PRIMARY KEY,at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS login_fail(k TEXT PRIMARY KEY,attempts INTEGER NOT NULL,locked INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS store_overrides(id TEXT PRIMARY KEY,city TEXT NOT NULL,category TEXT NOT NULL,data TEXT NOT NULL,manual INTEGER NOT NULL,deleted INTEGER NOT NULL,updated INTEGER NOT NULL,by_user TEXT NOT NULL);CREATE INDEX IF NOT EXISTS stores_city ON store_overrides(city);CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,place_id TEXT NOT NULL,place_name TEXT NOT NULL,city TEXT NOT NULL,phone TEXT NOT NULL,rating INTEGER NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS reviews_place ON reviews(place_id);").expect("schema");
    let admin_phone = env::var("WASHJOY_ADMIN_PHONE").expect("admin phone");
    let admin_pass = env::var("WASHJOY_ADMIN_PASSWORD").expect("admin password");
    let found: bool = db
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE phone=?)",
            params![admin_phone],
            |r| r.get(0),
        )
        .unwrap_or(false);
    if !found {
        db.execute(
            "INSERT INTO users(phone,pass,role,profile,created)VALUES(?,?,'admin',?,?)",
            params![
                admin_phone,
                pass_hash(&admin_pass).expect("admin hash"),
                json!({"displayName":"Washjoy 管理员"}).to_string(),
                now()
            ],
        )
        .expect("seed admin");
    }
    let s = S {
        db: Arc::new(Mutex::new(db)),
        admin: admin_phone,
        data,
        uploads,
        oss: env::var("WASHJOY_OSS_BUCKET").unwrap_or("fehd".into()),
        prefix: env::var("WASHJOY_OSS_PREFIX").unwrap_or("washjoy/uploads".into()),
        base: env::var("WASHJOY_OSS_BASE")
            .unwrap_or("https://fehd.oss-cn-shanghai.aliyuncs.com/washjoy/uploads".into()),
    };
    let app = Router::new()
        .route("/health", get(health))
        .route("/public-data", get(public_data))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(me))
        .route("/auth/logout", post(logout))
        .route("/auth/profile", put(profile))
        .route("/admin/places", get(admin_places).post(create))
        .route("/admin/places/{id}", put(save).delete(remove))
        .route("/admin/places/{id}/restore", post(restore))
        .route("/admin/trash", get(trash))
        .route("/admin/trash/{id}", delete(purge))
        .route("/admin/tags", get(tags))
        .route("/admin/reviews", get(admin_reviews))
        .route("/admin/reviews/{id}", delete(delete_review))
        .route("/reviews", get(place_reviews).post(add_review))
        .route("/reviews/mine", get(my_reviews))
        .route("/admin/upload", post(upload))
        .layer(DefaultBodyLimit::max(11 * 1024 * 1024))
        .with_state(s);
    let l = tokio::net::TcpListener::bind("127.0.0.1:3775")
        .await
        .expect("bind");
    println!("Washjoy Rust API listening on 127.0.0.1:3775");
    axum::serve(l, app).await.expect("server")
}
