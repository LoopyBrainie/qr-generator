#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::command;
use chrono::{DateTime, Utc};

#[command]
fn generate_qr_code(id: String, site_id: String, class_lesson_id: String) -> String {
    // 获取当前时间
    let now: DateTime<Utc> = Utc::now();
    // 格式化为ISO 8601格式
    let create_time = now.to_rfc3339();
    
    // 按照要求格式生成签到码
    let result = format!(
        "checkwork|id={}&siteId={}&createTime={}&classLessonId={}",
        id, site_id, create_time, class_lesson_id
    );
    
    println!("生成签到码: {}", result);
    result
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![generate_qr_code])
        .run(tauri::generate_context!())
        .expect("运行应用程序时出错");
}
