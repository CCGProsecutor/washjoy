use chrono::{DateTime, Utc};
use rusqlite::{Connection, Row};
use serde_json::Value;
use sqlx::{Postgres, Transaction, postgres::PgPoolOptions};
use std::{env, path::Path};

fn unix_seconds(value: i64) -> Result<DateTime<Utc>, Box<dyn std::error::Error>> {
    DateTime::from_timestamp(value, 0)
        .ok_or_else(|| format!("invalid unix timestamp: {value}").into())
}

fn text(row: &Row<'_>, name: &str) -> rusqlite::Result<String> {
    row.get(name)
}
fn integer(row: &Row<'_>, name: &str) -> rusqlite::Result<i64> {
    row.get(name)
}

async fn import_users(
    tx: &mut Transaction<'_, Postgres>,
    sqlite: &Connection,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = sqlite.prepare("SELECT phone, pass, role, profile, created FROM users")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            text(row, "phone")?,
            text(row, "pass")?,
            text(row, "role")?,
            text(row, "profile")?,
            integer(row, "created")?,
        ))
    })?;
    for row in rows {
        let (phone, pass, role, profile, created) = row?;
        let profile: Value = serde_json::from_str(&profile)?;
        sqlx::query("INSERT INTO users(phone, pass, role, profile, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(phone) DO UPDATE SET pass=EXCLUDED.pass, role=EXCLUDED.role, profile=EXCLUDED.profile, created_at=EXCLUDED.created_at")
            .bind(phone).bind(pass).bind(role).bind(profile).bind(unix_seconds(created)?).execute(&mut **tx).await?;
    }
    Ok(())
}

async fn import_sessions(
    tx: &mut Transaction<'_, Postgres>,
    sqlite: &Connection,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = sqlite.prepare("SELECT token_hash, phone, expires FROM sessions")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            text(row, "token_hash")?,
            text(row, "phone")?,
            integer(row, "expires")?,
        ))
    })?;
    for row in rows {
        let (token_hash, phone, expires) = row?;
        sqlx::query("INSERT INTO sessions(token_hash, phone, expires_at) VALUES ($1,$2,$3) ON CONFLICT(token_hash) DO UPDATE SET phone=EXCLUDED.phone, expires_at=EXCLUDED.expires_at")
            .bind(token_hash).bind(phone).bind(unix_seconds(expires)?).execute(&mut **tx).await?;
    }
    Ok(())
}

async fn import_overrides(
    tx: &mut Transaction<'_, Postgres>,
    sqlite: &Connection,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = sqlite.prepare(
        "SELECT id, city, category, data, manual, deleted, updated, by_user FROM store_overrides",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            text(row, "id")?,
            text(row, "city")?,
            text(row, "category")?,
            text(row, "data")?,
            integer(row, "manual")?,
            integer(row, "deleted")?,
            integer(row, "updated")?,
            text(row, "by_user")?,
        ))
    })?;
    for row in rows {
        let (id, city, category, data, manual, deleted, updated, by_user) = row?;
        let data: Value = serde_json::from_str(&data)?;
        sqlx::query("INSERT INTO store_overrides(id, city, category, data, manual, deleted, updated_at, by_user) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET city=EXCLUDED.city, category=EXCLUDED.category, data=EXCLUDED.data, manual=EXCLUDED.manual, deleted=EXCLUDED.deleted, updated_at=EXCLUDED.updated_at, by_user=EXCLUDED.by_user WHERE store_overrides.updated_at <= EXCLUDED.updated_at")
            .bind(id).bind(city).bind(category).bind(data).bind(manual != 0).bind(deleted != 0).bind(unix_seconds(updated)?).bind(by_user).execute(&mut **tx).await?;
    }
    Ok(())
}

async fn import_reviews(
    tx: &mut Transaction<'_, Postgres>,
    sqlite: &Connection,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = sqlite.prepare(
        "SELECT id, place_id, place_name, city, phone, rating, text, created FROM reviews",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            integer(row, "id")?,
            text(row, "place_id")?,
            text(row, "place_name")?,
            text(row, "city")?,
            text(row, "phone")?,
            integer(row, "rating")?,
            text(row, "text")?,
            integer(row, "created")?,
        ))
    })?;
    for row in rows {
        let (id, place_id, place_name, city, phone, rating, review_text, created) = row?;
        sqlx::query("INSERT INTO reviews(id, place_id, place_name, city, phone, rating, text, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET place_name=EXCLUDED.place_name, city=EXCLUDED.city, rating=EXCLUDED.rating, text=EXCLUDED.text, created_at=EXCLUDED.created_at")
            .bind(id).bind(place_id).bind(place_name).bind(city).bind(phone).bind(rating).bind(review_text).bind(unix_seconds(created)?).execute(&mut **tx).await?;
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = env::var("DATABASE_URL").map_err(|_| "DATABASE_URL is required")?;
    let sqlite_path = env::var("WASHJOY_SQLITE_PATH")
        .unwrap_or_else(|_| "/var/lib/washjoy/washjoy.sqlite3".into());
    if !Path::new(&sqlite_path).exists() {
        return Err(format!("SQLite file does not exist: {sqlite_path}").into());
    }
    let sqlite = Connection::open(&sqlite_path)?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    let mut tx = pool.begin().await?;
    import_users(&mut tx, &sqlite).await?;
    import_sessions(&mut tx, &sqlite).await?;
    import_overrides(&mut tx, &sqlite).await?;
    import_reviews(&mut tx, &sqlite).await?;
    tx.commit().await?;
    println!("SQLite import completed successfully");
    Ok(())
}
