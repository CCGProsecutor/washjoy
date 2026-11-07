use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path as AxPath, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
};
use base64::{Engine, engine::general_purpose::STANDARD};
use rand::{RngCore, rngs::OsRng};
use scrypt::{
    Scrypt,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row, postgres::PgPoolOptions};
use std::{
    env, fs,
    path::PathBuf,
    process::Stdio,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::process::Command;
#[derive(Clone)]
struct S {
    pg: PgPool,
    admin: String,
    uploads: PathBuf,
    oss: String,
    prefix: String,
    base: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct E {
    // `error` remains for older clients; the other fields are the typed contract.
    error: String,
    code: String,
    message: String,
    request_id: String,
}
#[derive(Debug)]
struct ApiError(StatusCode, String);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let request_id = token()[..16].to_string();
        let mut response = (
            self.0,
            Json(E {
                error: self.1.clone(),
                code: error_code(self.0).to_string(),
                message: self.1,
                request_id: request_id.clone(),
            }),
        )
            .into_response();
        response
            .headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        response.headers_mut().insert(
            "x-request-id",
            HeaderValue::from_str(&request_id).expect("request id header"),
        );
        response
    }
}
type R<T> = Result<T, ApiError>;
fn e(c: StatusCode, s: impl Into<String>) -> ApiError {
    ApiError(c, s.into())
}
fn error_code(status: StatusCode) -> &'static str {
    match status {
        StatusCode::BAD_REQUEST => "bad_request",
        StatusCode::UNAUTHORIZED => "unauthorized",
        StatusCode::FORBIDDEN => "forbidden",
        StatusCode::NOT_FOUND => "not_found",
        StatusCode::CONFLICT => "conflict",
        StatusCode::PAYLOAD_TOO_LARGE => "payload_too_large",
        StatusCode::TOO_MANY_REQUESTS => "rate_limited",
        StatusCode::BAD_GATEWAY => "upstream_unavailable",
        _ => "internal_error",
    }
}
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
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
    let secure = if env::var("WASHJOY_COOKIE_SECURE")
        .map(|v| v != "0")
        .unwrap_or(true)
    {
        "; Secure"
    } else {
        ""
    };
    HeaderValue::from_str(&format!(
        "washjoy_session={t}; Path=/washjoy/api; HttpOnly{secure}; SameSite=Strict; Max-Age=43200"
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
async fn auth(s: &S, h: &HeaderMap) -> R<User> {
    let raw = h
        .get(header::COOKIE)
        .and_then(|x| x.to_str().ok())
        .unwrap_or("");
    let t = raw
        .split(';')
        .map(str::trim)
        .find_map(|x| x.strip_prefix("washjoy_session="))
        .ok_or_else(|| e(StatusCode::UNAUTHORIZED, "请先登录"))?;
    let row = sqlx::query("SELECT u.phone,u.role,u.profile,EXTRACT(EPOCH FROM u.created_at)::bigint AS created,EXTRACT(EPOCH FROM se.expires_at)::bigint AS expires FROM sessions se JOIN users u ON u.phone=se.phone WHERE se.token_hash=$1")
        .bind(thash(t)).fetch_optional(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "登录状态读取失败"))?
        .ok_or_else(|| e(StatusCode::UNAUTHORIZED, "登录状态已失效"))?;
    let phone: String = row
        .try_get("phone")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "登录状态读取失败"))?;
    let role: String = row
        .try_get("role")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "登录状态读取失败"))?;
    let profile: Value = row.try_get("profile").unwrap_or_else(|_| json!({}));
    let created: i64 = row.try_get("created").unwrap_or_default();
    let expires: i64 = row.try_get("expires").unwrap_or_default();
    if expires < now() {
        let _ = sqlx::query("DELETE FROM sessions WHERE token_hash=$1")
            .bind(thash(t))
            .execute(&s.pg)
            .await;
        return Err(e(StatusCode::UNAUTHORIZED, "登录已过期"));
    }
    Ok(User {
        phone,
        role,
        profile,
        created_at: created,
    })
}
async fn admin(s: &S, h: &HeaderMap) -> R<User> {
    let u = auth(s, h).await?;
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
    let dir = env::var("WASHJOY_STORE_DIR").unwrap_or_else(|_| "/var/www/html/washjoy/data".into());
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
    let mut tx =
        s.pg.begin()
            .await
            .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "数据库不可用"))?;
    let last: Option<i64> = sqlx::query_scalar(
        "SELECT EXTRACT(EPOCH FROM attempted_at)::bigint FROM reg_limit WHERE ip=$1",
    )
    .bind(ip)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "限流检查失败"))?;
    if let Some(last) = last
        && t - last < 30
    {
        return Err(e(
            StatusCode::TOO_MANY_REQUESTS,
            format!("每个 IP 注册间隔 30 秒，请{}秒后重试", 30 - (t - last)),
        ));
    }
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE phone=$1)")
        .bind(p)
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(false);
    if exists {
        return Err(e(StatusCode::CONFLICT, "手机号已注册"));
    }
    let hash = pass_hash(&b.password)?;
    let created = chrono::DateTime::from_timestamp(t, 0)
        .ok_or_else(|| e(StatusCode::INTERNAL_SERVER_ERROR, "时间错误"))?;
    let expires = chrono::DateTime::from_timestamp(t + 43200, 0)
        .ok_or_else(|| e(StatusCode::INTERNAL_SERVER_ERROR, "时间错误"))?;
    sqlx::query("INSERT INTO reg_limit(ip,attempted_at) VALUES($1,$2) ON CONFLICT(ip) DO UPDATE SET attempted_at=EXCLUDED.attempted_at")
        .bind(ip).bind(created).execute(&mut *tx).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"限流状态保存失败"))?;
    sqlx::query("INSERT INTO users(phone,pass,role,profile,created_at) VALUES($1,$2,$3,$4,$5)")
        .bind(p)
        .bind(hash)
        .bind(role)
        .bind(profile.clone())
        .bind(created)
        .execute(&mut *tx)
        .await
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "注册信息保存失败"))?;
    sqlx::query("INSERT INTO sessions(token_hash,phone,expires_at) VALUES($1,$2,$3)")
        .bind(thash(&tk))
        .bind(p)
        .bind(expires)
        .execute(&mut *tx)
        .await
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "登录状态保存失败"))?;
    tx.commit()
        .await
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "注册信息保存失败"))?;
    Ok(respond(
        StatusCode::CREATED,
        json!({"user":{"phone":p,"role":role,"profile":profile,"createdAt":t}}),
        Some(cookie(&tk)),
    ))
}
async fn record_login_failure(pg: &PgPool, key: &str, t: i64) {
    let locked = chrono::DateTime::from_timestamp(t + 900, 0).unwrap();
    let _ = sqlx::query("INSERT INTO login_fail(key,attempts,locked_at) VALUES($1,1,NULL) ON CONFLICT(key) DO UPDATE SET attempts=login_fail.attempts+1,locked_at=CASE WHEN login_fail.attempts+1>=8 THEN $2 ELSE login_fail.locked_at END")
        .bind(key).bind(locked).execute(pg).await;
}
async fn login(State(s): State<S>, h: HeaderMap, Json(b): Json<Login>) -> R<Response> {
    let p = b.phone.trim();
    let ip = h
        .get("x-real-ip")
        .and_then(|x| x.to_str().ok())
        .unwrap_or("unknown");
    let key = format!("{ip}:{p}");
    let t = now();
    let fail = sqlx::query("SELECT attempts,EXTRACT(EPOCH FROM locked_at)::bigint AS locked FROM login_fail WHERE key=$1")
        .bind(&key).fetch_optional(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"登录状态读取失败"))?;
    if fail
        .as_ref()
        .and_then(|x| x.try_get::<Option<i64>, _>("locked").ok().flatten())
        .is_some_and(|x| x > t)
    {
        return Err(e(
            StatusCode::TOO_MANY_REQUESTS,
            "登录错误过多，请15分钟后重试",
        ));
    }
    let row = sqlx::query("SELECT pass,role,profile,EXTRACT(EPOCH FROM created_at)::bigint AS created FROM users WHERE phone=$1")
        .bind(p).fetch_optional(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"账户读取失败"))?;
    let Some(row) = row else {
        record_login_failure(&s.pg, &key, t).await;
        return Err(e(StatusCode::UNAUTHORIZED, "手机号或密码错误"));
    };
    let stored: String = row
        .try_get("pass")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "账户凭据错误"))?;
    let role: String = row
        .try_get("role")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "账户读取失败"))?;
    let profile: Value = row.try_get("profile").unwrap_or_else(|_| json!({}));
    let created: i64 = row.try_get("created").unwrap_or_default();
    let parsed = PasswordHash::new(&stored)
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "账户凭据错误"))?;
    if Scrypt
        .verify_password(b.password.as_bytes(), &parsed)
        .is_err()
    {
        record_login_failure(&s.pg, &key, t).await;
        return Err(e(StatusCode::UNAUTHORIZED, "手机号或密码错误"));
    }
    let _ = sqlx::query("DELETE FROM login_fail WHERE key=$1")
        .bind(&key)
        .execute(&s.pg)
        .await;
    let tk = token();
    let expires = chrono::DateTime::from_timestamp(t + 43200, 0)
        .ok_or_else(|| e(StatusCode::INTERNAL_SERVER_ERROR, "时间错误"))?;
    sqlx::query("INSERT INTO sessions(token_hash,phone,expires_at) VALUES($1,$2,$3)")
        .bind(thash(&tk))
        .bind(p)
        .bind(expires)
        .execute(&s.pg)
        .await
        .map_err(|err| {
            eprintln!("session insert failed: {err}");
            e(StatusCode::INTERNAL_SERVER_ERROR, "创建会话失败")
        })?;
    Ok(respond(
        StatusCode::OK,
        json!({"user":{"phone":p,"role":role,"profile":profile,"createdAt":created}}),
        Some(cookie(&tk)),
    ))
}
async fn me(State(s): State<S>, h: HeaderMap) -> R<Json<Value>> {
    let u = match auth(&s, &h).await {
        Ok(user) => user,
        Err(err) if err.0 == StatusCode::UNAUTHORIZED => return Ok(Json(Value::Null)),
        Err(err) => return Err(err),
    };
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
        let _ = sqlx::query("DELETE FROM sessions WHERE token_hash=$1")
            .bind(thash(t))
            .execute(&s.pg)
            .await;
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
    let u = auth(&s, &h).await?;
    let p = json!({"displayName":b.display_name.trim().chars().take(40).collect::<String>()});
    sqlx::query("UPDATE users SET profile=$1 WHERE phone=$2")
        .bind(p.clone())
        .bind(u.phone)
        .execute(&s.pg)
        .await
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
    let u = auth(&s, &h).await?;
    let text = b.text.trim();
    if !(1..=5).contains(&b.rating) {
        return Err(e(StatusCode::BAD_REQUEST, "评分需在 1-5 星之间"));
    }
    if text.is_empty() || text.chars().count() > 500 {
        return Err(e(StatusCode::BAD_REQUEST, "评价内容需为 1-500 字"));
    }
    let name = merged(&s, &b.city)
        .await?
        .get("pois")
        .and_then(|a| a.as_array())
        .and_then(|a| a.iter().find(|x| x["id"] == b.place_id))
        .and_then(|x| x["name"].as_str().map(str::to_owned))
        .ok_or_else(|| e(StatusCode::NOT_FOUND, "门店不存在"))?;
    let created = now();
    let created_at = chrono::DateTime::from_timestamp(created, 0)
        .ok_or_else(|| e(StatusCode::INTERNAL_SERVER_ERROR, "时间错误"))?;
    let row = sqlx::query("INSERT INTO reviews(place_id,place_name,city,phone,rating,text,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id")
        .bind(&b.place_id).bind(&name).bind(city_name(&b.city)).bind(&u.phone).bind(b.rating).bind(text).bind(created_at)
        .fetch_one(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"评价保存失败"))?;
    let id: i64 = row
        .try_get("id")
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价保存失败"))?;
    Ok(Json(
        json!({"ok":true,"review":{"id":id,"rating":b.rating,"text":text,"author":mask_phone(&u.phone),"placeName":name,"created":created}}),
    ))
}
async fn place_reviews(State(s): State<S>, Query(q): Query<ReviewQuery>) -> R<Json<Value>> {
    let pid = q
        .place_id
        .ok_or_else(|| e(StatusCode::BAD_REQUEST, "缺少门店参数"))?;
    let avg = sqlx::query("SELECT COALESCE(AVG(rating),0)::float8 AS average,COUNT(*)::bigint AS count FROM reviews WHERE place_id=$1").bind(&pid).fetch_one(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"评价读取失败"))?;
    let average_raw: f64 = avg.try_get("average").unwrap_or(0.0);
    let count: i64 = avg.try_get("count").unwrap_or(0);
    let rows = sqlx::query("SELECT id,rating,text,phone,EXTRACT(EPOCH FROM created_at)::bigint AS created,place_name FROM reviews WHERE place_id=$1 ORDER BY id DESC LIMIT 50").bind(&pid).fetch_all(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"评价读取失败"))?;
    let mut list = Vec::new();
    for x in rows {
        let id: i64 = x.try_get("id").unwrap_or_default();
        let rating: i64 = x.try_get("rating").unwrap_or_default();
        let text: String = x.try_get("text").unwrap_or_default();
        let phone: String = x.try_get("phone").unwrap_or_default();
        let created: i64 = x.try_get("created").unwrap_or_default();
        let place: String = x.try_get("place_name").unwrap_or_default();
        list.push(json!({"id":id,"rating":rating,"text":text,"author":mask_phone(&phone),"created":created,"placeName":place}));
    }
    let average = (average_raw * 10.0).round() / 10.0;
    Ok(Json(
        json!({"reviews":list,"average":average,"count":count}),
    ))
}
async fn my_reviews(State(s): State<S>, h: HeaderMap) -> R<Json<Value>> {
    let u = auth(&s, &h).await?;
    let rows = sqlx::query("SELECT id,place_id,place_name,rating,text,EXTRACT(EPOCH FROM created_at)::bigint AS created FROM reviews WHERE phone=$1 ORDER BY id DESC LIMIT 100").bind(&u.phone).fetch_all(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"评价读取失败"))?;
    let list: Vec<Value> = rows.into_iter().map(|r| json!({"id":r.try_get::<i64,_>("id").unwrap_or_default(),"placeId":r.try_get::<String,_>("place_id").unwrap_or_default(),"placeName":r.try_get::<String,_>("place_name").unwrap_or_default(),"rating":r.try_get::<i64,_>("rating").unwrap_or_default(),"text":r.try_get::<String,_>("text").unwrap_or_default(),"created":r.try_get::<i64,_>("created").unwrap_or_default()})).collect();
    Ok(Json(json!({"reviews":list})))
}
async fn admin_reviews(
    State(s): State<S>,
    h: HeaderMap,
    Query(q): Query<ReviewQuery>,
) -> R<Json<Value>> {
    admin(&s, &h).await?;
    let rows = match (&q.place_id, &q.city) {
        (Some(p), Some(c)) => sqlx::query("SELECT id,place_id,place_name,rating,text,phone,EXTRACT(EPOCH FROM created_at)::bigint AS created,city FROM reviews WHERE place_id=$1 AND city=$2 ORDER BY id DESC LIMIT 300").bind(p).bind(city_name(c)).fetch_all(&s.pg).await,
        (Some(p), None) => sqlx::query("SELECT id,place_id,place_name,rating,text,phone,EXTRACT(EPOCH FROM created_at)::bigint AS created,city FROM reviews WHERE place_id=$1 ORDER BY id DESC LIMIT 300").bind(p).fetch_all(&s.pg).await,
        (None, Some(c)) => sqlx::query("SELECT id,place_id,place_name,rating,text,phone,EXTRACT(EPOCH FROM created_at)::bigint AS created,city FROM reviews WHERE city=$1 ORDER BY id DESC LIMIT 300").bind(city_name(c)).fetch_all(&s.pg).await,
        (None, None) => sqlx::query("SELECT id,place_id,place_name,rating,text,phone,EXTRACT(EPOCH FROM created_at)::bigint AS created,city FROM reviews ORDER BY id DESC LIMIT 300").fetch_all(&s.pg).await,
    }.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"评价读取失败"))?;
    let list: Vec<Value> = rows.into_iter().map(|r| { let phone=r.try_get::<String,_>("phone").unwrap_or_default(); json!({"id":r.try_get::<i64,_>("id").unwrap_or_default(),"placeId":r.try_get::<String,_>("place_id").unwrap_or_default(),"placeName":r.try_get::<String,_>("place_name").unwrap_or_default(),"rating":r.try_get::<i64,_>("rating").unwrap_or_default(),"text":r.try_get::<String,_>("text").unwrap_or_default(),"phone":mask_phone(&phone),"created":r.try_get::<i64,_>("created").unwrap_or_default(),"city":r.try_get::<String,_>("city").unwrap_or_default()}) }).collect();
    Ok(Json(json!({"reviews":list})))
}
async fn delete_review(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<i64>,
) -> R<Json<Value>> {
    admin(&s, &h).await?;
    let n = sqlx::query("DELETE FROM reviews WHERE id=$1")
        .bind(id)
        .execute(&s.pg)
        .await
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "评价删除失败"))?
        .rows_affected();
    if n == 0 {
        return Err(e(StatusCode::NOT_FOUND, "评价不存在"));
    }
    Ok(Json(json!({"ok":true})))
}
async fn merged(s: &S, city: &str) -> R<Value> {
    let file = src(city_name(city)).ok_or_else(|| e(StatusCode::NOT_FOUND, "城市不存在"))?;
    let mut data: Value = serde_json::from_slice(
        &fs::read(file)
            .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "基础门店数据读取失败"))?,
    )
    .map_err(|x| e(StatusCode::INTERNAL_SERVER_ERROR, x.to_string()))?;
    let rows = sqlx::query("SELECT id,category,data,deleted,EXTRACT(EPOCH FROM updated_at)::bigint AS updated FROM store_overrides WHERE city=$1")
        .bind(city_name(city)).fetch_all(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"人工覆盖读取失败"))?;
    let mut edits = std::collections::HashMap::new();
    for x in rows {
        let id: String = x.try_get("id").unwrap_or_default();
        let c: String = x.try_get("category").unwrap_or_default();
        let v: Value = x.try_get("data").unwrap_or_else(|_| json!({}));
        let d: bool = x.try_get("deleted").unwrap_or(false);
        let updated: i64 = x.try_get("updated").unwrap_or_default();
        edits.insert(id, (c, v, d, updated));
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
    let rows = sqlx::query("SELECT id,category,data,EXTRACT(EPOCH FROM updated_at)::bigint AS updated FROM store_overrides WHERE city=$1 AND manual=true AND deleted=false")
        .bind(city_name(city)).fetch_all(&s.pg).await.map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR,"手工门店读取失败"))?;
    for x in rows {
        let id: String = x.try_get("id").unwrap_or_default();
        let cat: String = x.try_get("category").unwrap_or_default();
        let mut p: Value = x.try_get("data").unwrap_or_else(|_| json!({}));
        let updated: i64 = x.try_get("updated").unwrap_or_default();
        p["id"] = json!(id);
        p["adminCategory"] = json!(cat);
        p["manual"] = json!(true);
        p["adminUpdatedAt"] = json!(updated);
        arr.push(p)
    }
    {
        let rows = sqlx::query("SELECT place_id,COUNT(*)::bigint AS count,AVG(rating)::float8 AS average FROM reviews GROUP BY place_id").fetch_all(&s.pg).await.unwrap_or_default();
        let mut map = std::collections::HashMap::new();
        for row in rows {
            map.insert(
                row.try_get::<String, _>("place_id").unwrap_or_default(),
                (
                    row.try_get::<i64, _>("count").unwrap_or_default(),
                    row.try_get::<f64, _>("average").unwrap_or_default(),
                ),
            );
        }
        if let Some(arr) = data["pois"].as_array_mut() {
            for p in arr.iter_mut() {
                if let Some(id) = p["id"].as_str()
                    && let Some((count, avg)) = map.get(id)
                {
                    p["reviewCount"] = json!(count);
                    p["reviewRating"] = json!(((avg * 10.0).round()) / 10.0);
                }
            }
        }
    }
    Ok(data)
}
async fn public_data(State(s): State<S>, Query(c): Query<City>) -> R<Response> {
    Ok(respond(StatusCode::OK, merged(&s, &c.city).await?, None))
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
        || (["洗浴", "温泉", "汤泉", "水会", "水汇", "汗蒸"]
            .iter()
            .any(|word| text.contains(word))
            && cost > 0.0
            && cost < 80.0)
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
    admin(&s, &h).await?;
    let d = merged(&s, &c.city).await?;
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
    let u = admin(&s, &h).await?;
    let city = city_name(&b.city);
    let d = merged(&s, &b.city).await?;
    let exists = d["pois"]
        .as_array()
        .is_some_and(|a| a.iter().any(|x| x["id"] == id));
    let manual = id.starts_with("manual-");
    if !exists && !manual {
        return Err(e(StatusCode::NOT_FOUND, "门店不存在"));
    }
    let v = make_place(&b, &id)?;
    let updated = chrono::DateTime::from_timestamp(now(), 0).unwrap();
    sqlx::query("INSERT INTO store_overrides(id,city,category,data,manual,deleted,updated_at,by_user) VALUES($1,$2,$3,$4,$5,false,$6,$7) ON CONFLICT(id) DO UPDATE SET city=EXCLUDED.city,category=EXCLUDED.category,data=EXCLUDED.data,manual=(store_overrides.manual OR EXCLUDED.manual),deleted=false,updated_at=EXCLUDED.updated_at,by_user=EXCLUDED.by_user")
        .bind(&id).bind(city).bind(&b.category).bind(v).bind(manual).bind(updated).bind(&u.phone).execute(&s.pg).await.map_err(|err| { eprintln!("place save failed for {id}: {err}"); e(StatusCode::INTERNAL_SERVER_ERROR,"门店保存失败") })?;
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn create(State(s): State<S>, h: HeaderMap, Json(b): Json<Place>) -> R<Response> {
    admin(&s, &h).await?;
    if b.name.trim().is_empty() {
        return Err(e(StatusCode::BAD_REQUEST, "门店名称必填"));
    }
    let id = format!("manual-{}", &token()[..18]);
    let v = make_place(&b, &id)?;
    let u = admin(&s, &h).await?;
    sqlx::query("INSERT INTO store_overrides(id,city,category,data,manual,deleted,updated_at,by_user) VALUES($1,$2,$3,$4,true,false,$5,$6)").bind(&id).bind(city_name(&b.city)).bind(&b.category).bind(v).bind(chrono::DateTime::from_timestamp(now(),0).unwrap()).bind(&u.phone).execute(&s.pg).await.map_err(|_|e(StatusCode::INTERNAL_SERVER_ERROR,"手工门店保存失败"))?;
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
    let u = admin(&s, &h).await?;
    let city = city_name(&c.city);
    let data = merged(&s, &c.city)
        .await?
        .get("pois")
        .and_then(|a| a.as_array())
        .and_then(|a| a.iter().find(|x| x["id"] == id).cloned());
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
    sqlx::query("INSERT INTO store_overrides(id,city,category,data,manual,deleted,updated_at,by_user) VALUES($1,$2,$3,$4,$5,true,$6,$7) ON CONFLICT(id) DO UPDATE SET deleted=true,updated_at=EXCLUDED.updated_at,by_user=EXCLUDED.by_user")
        .bind(&id).bind(city).bind(&category).bind(data).bind(manual).bind(chrono::DateTime::from_timestamp(now(),0).unwrap()).bind(&u.phone).execute(&s.pg).await.map_err(|_|e(StatusCode::INTERNAL_SERVER_ERROR,"删除失败"))?;
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn trash(State(s): State<S>, h: HeaderMap, Query(c): Query<City>) -> R<Json<Value>> {
    admin(&s, &h).await?;
    let name = city_name(&c.city);
    let rows=sqlx::query("SELECT id,data,EXTRACT(EPOCH FROM updated_at)::bigint AS updated,manual FROM store_overrides WHERE city=$1 AND deleted=true ORDER BY updated_at DESC").bind(name).fetch_all(&s.pg).await.map_err(|_|e(StatusCode::INTERNAL_SERVER_ERROR,"回收站读取失败"))?;
    let mut out = Vec::new();
    for row in rows {
        let id: String = row.try_get("id").unwrap_or_default();
        let v: Value = row.try_get("data").unwrap_or_else(|_| json!({}));
        let updated: i64 = row.try_get("updated").unwrap_or_default();
        let manual: bool = row.try_get("manual").unwrap_or(false);
        let mut item = admin_row(&v, name);
        item["id"] = json!(id);
        item["manual"] = json!(manual);
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
    let u = admin(&s, &h).await?;
    let n=sqlx::query("UPDATE store_overrides SET deleted=false,updated_at=$1,by_user=$2 WHERE id=$3 AND city=$4 AND deleted=true").bind(chrono::DateTime::from_timestamp(now(),0).unwrap()).bind(&u.phone).bind(&id).bind(city_name(&c.city)).execute(&s.pg).await.map_err(|_|e(StatusCode::INTERNAL_SERVER_ERROR,"恢复失败"))?.rows_affected();
    if n == 0 {
        return Err(e(StatusCode::NOT_FOUND, "回收站中没有这家门店"));
    }
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn purge(
    State(s): State<S>,
    h: HeaderMap,
    AxPath(id): AxPath<String>,
    Query(c): Query<City>,
) -> R<Json<Value>> {
    admin(&s, &h).await?;
    let city = city_name(&c.city);
    if !id.starts_with("manual-") {
        return Err(e(
            StatusCode::BAD_REQUEST,
            "高德门店无法彻底删除，可恢复或保持隐藏",
        ));
    }
    let n = sqlx::query("DELETE FROM store_overrides WHERE id=$1 AND city=$2 AND deleted=true")
        .bind(&id)
        .bind(city)
        .execute(&s.pg)
        .await
        .map_err(|_| e(StatusCode::INTERNAL_SERVER_ERROR, "彻底删除失败"))?
        .rows_affected();
    if n == 0 {
        return Err(e(StatusCode::NOT_FOUND, "回收站中没有这家门店"));
    }
    Ok(Json(json!({"ok":true,"id":id})))
}
async fn tags(State(s): State<S>, h: HeaderMap, Query(c): Query<City>) -> R<Json<Value>> {
    admin(&s, &h).await?;
    let mut counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut push = |raw: &str| {
        for t in raw.split(['|', ',', '、', ';']) {
            let t = t.trim();
            if !t.is_empty() && t.chars().count() <= 24 {
                *counts.entry(t.to_string()).or_insert(0) += 1;
            }
        }
    };
    if let Ok(d) = merged(&s, &c.city).await
        && let Some(arr) = d["pois"].as_array()
    {
        for p in arr {
            for key in ["services", "service_summary"] {
                if let Some(v) = p[key].as_str() {
                    push(v);
                }
            }
        }
    }
    let rows = sqlx::query("SELECT data FROM store_overrides WHERE city=$1")
        .bind(city_name(&c.city))
        .fetch_all(&s.pg)
        .await
        .unwrap_or_default();
    for row in rows {
        let p: Value = row.try_get("data").unwrap_or_else(|_| json!({}));
        for key in ["services", "service_summary"] {
            if let Some(t) = p[key].as_str() {
                push(t);
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
    admin(&s, &h).await?;
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
    let uploads = PathBuf::from(
        env::var("WASHJOY_UPLOAD_DIR").unwrap_or("/var/www/html/washjoy/uploads".into()),
    );
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL");
    let pg = PgPoolOptions::new()
        .max_connections(8)
        .connect(&database_url)
        .await
        .expect("postgres connection");
    sqlx::migrate!("./migrations")
        .run(&pg)
        .await
        .expect("postgres migrations");
    println!("PostgreSQL connectivity and migrations verified");
    fs::create_dir_all(&uploads).expect("upload dir");
    let admin_phone = env::var("WASHJOY_ADMIN_PHONE").expect("admin phone");
    let s = S {
        pg,
        admin: admin_phone,
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
    let listen_addr = env::var("WASHJOY_LISTEN_ADDR").unwrap_or_else(|_| "127.0.0.1:3775".into());
    let l = tokio::net::TcpListener::bind(&listen_addr)
        .await
        .expect("bind");
    println!("Washjoy Rust API listening on {listen_addr}");
    axum::serve(l, app).await.expect("server")
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;

    use super::*;

    #[tokio::test]
    async fn errors_keep_legacy_field_and_expose_contract_fields() {
        let response = e(StatusCode::BAD_REQUEST, "输入无效").into_response();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let request_id = response
            .headers()
            .get("x-request-id")
            .and_then(|value| value.to_str().ok())
            .expect("request id header")
            .to_string();
        assert_eq!(request_id.len(), 16);

        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("error body");
        let value: Value = serde_json::from_slice(&body).expect("error JSON");
        assert_eq!(value["error"], "输入无效");
        assert_eq!(value["code"], "bad_request");
        assert_eq!(value["message"], "输入无效");
        assert_eq!(value["requestId"], request_id);
    }

    #[tokio::test]
    async fn missing_session_cookie_is_rejected_without_database_io() {
        let state = S {
            pg: PgPoolOptions::new()
                .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
                .expect("lazy pool"),
            admin: "admin".to_string(),
            uploads: PathBuf::new(),
            oss: String::new(),
            prefix: String::new(),
            base: String::new(),
        };

        let error = match auth(&state, &HeaderMap::new()).await {
            Err(error) => error,
            Ok(_) => panic!("a missing session must be rejected"),
        };
        assert_eq!(error.into_response().status(), StatusCode::UNAUTHORIZED);
    }
}
