#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::command;
use chrono::{DateTime, Local};
use num_bigint::BigUint;
use num_traits::{ToPrimitive, Zero};

#[command]
fn generate_qr_code(id: String, site_id: String, class_lesson_id: String) -> String {
    // 获取当前本地时间
    let now: DateTime<Local> = Local::now();
    // 格式化为ISO 8601格式
    let create_time = now.to_rfc3339();
    let checksum_full = base62_encode(create_time.as_bytes());
    let checksum_code: String = checksum_full.chars().take(22).collect();
    // 按照要求格式生成签到码
    let result = format!(
        "checkwork|id={}&siteId={}&createTime={}&classLessonId={}",
        id, site_id, checksum_code, class_lesson_id
    );
    
    println!("生成签到码: {}", result);
    result
}

fn base62_encode(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 62] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    if bytes.is_empty() {
        return "0".to_string();
    }

    let mut value = BigUint::from_bytes_be(bytes);
    if value.is_zero() {
        return "0".to_string();
    }

    let base = BigUint::from(62u32);
    let mut buffer = Vec::new();
    while !value.is_zero() {
        let remainder = (&value % &base)
            .to_usize()
            .expect("余数应当适配 usize 范围");
        buffer.push(CHARSET[remainder] as char);
        value /= &base;
    }

    buffer.iter().rev().collect()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![generate_qr_code])
        .run(tauri::generate_context!())
        .expect("运行应用程序时出错");
}
