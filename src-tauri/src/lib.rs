mod script_engine;

use num_bigint::BigUint;
use num_traits::{ToPrimitive, Zero};
use script_engine::ScriptEngine;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// 全局脚本引擎状态
pub struct AppState {
    pub script_engine: Mutex<ScriptEngine>,
}

/// 请求数据结构
#[derive(Debug, Deserialize)]
pub struct HandleRequestInput {
    /// 脚本名称（从 scripts/ 目录加载）
    #[serde(default)]
    pub script: Option<String>,
    /// 脚本内容（直接执行）
    #[serde(default)]
    pub code: Option<String>,
    /// 输入数据
    pub data: serde_yaml::Value,
}

/// 响应数据结构
#[derive(Debug, Serialize)]
pub struct HandleRequestResponse {
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// 处理请求的 Tauri 命令
/// 支持两种模式：
/// 1. script 模式：从外部文件加载脚本
/// 2. code 模式：直接执行传入的脚本代码
#[tauri::command]
fn handle_request(
    state: State<AppState>,
    input: HandleRequestInput,
) -> HandleRequestResponse {
    println!("收到请求: script={:?}, data={:?}", input.script, input.data);

    // 将 YAML 输入转换为 JSON
    let json_data = serde_json::to_value(&input.data).unwrap_or(serde_json::Value::Null);

    // 转换为 Rhai Dynamic 类型
    let input_dynamic = ScriptEngine::json_to_dynamic(&json_data);

    let engine = match state.script_engine.lock() {
        Ok(e) => e,
        Err(e) => {
            return HandleRequestResponse {
                result: None,
                error: Some(format!("Failed to acquire engine lock: {}", e)),
            };
        }
    };

    // 执行脚本
    let result = if let Some(script_name) = input.script {
        // 模式1：从外部文件加载脚本
        engine.execute(&script_name, input_dynamic)
    } else if let Some(code) = input.code {
        // 模式2：直接执行脚本代码
        engine.execute_string(&code, input_dynamic)
    } else {
        Err("Either 'script' or 'code' must be provided".to_string())
    };

    match result {
        Ok(dynamic) => {
            println!("脚本返回类型: {:?}", dynamic.type_name());
            println!("脚本返回内容: {:?}", dynamic);
            let json_result = ScriptEngine::dynamic_to_json(dynamic);
            println!("转换为JSON: {:?}", json_result);
            HandleRequestResponse {
                result: Some(json_result),
                error: None,
            }
        }
        Err(e) => HandleRequestResponse {
            result: None,
            error: Some(e),
        },
    }
}

/// 生成签到码的 Tauri 命令（保留原有功能）
#[tauri::command]
fn generate_qr_code(id: String, site_id: String, class_lesson_id: String) -> String {
    // 获取当前 UTC 时间
    let now = chrono::Utc::now();
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

/// 查找 scripts 目录的多种方式
fn locate_scripts_dir() -> std::path::PathBuf {
    // 1. 尝试从 exe 同级目录
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let scripts = parent.join("scripts");
            if scripts.exists() {
                return scripts;
            }
        }
    }

    // 2. 尝试从资源目录 (打包后)
    if let Ok(resource_path) = std::env::current_exe() {
        if let Some(parent) = resource_path.parent() {
            let resources = parent.join("_up_").join("scripts");
            if resources.exists() {
                return resources;
            }
        }
    }

    // 3. 开发模式：项目根目录的 src-tauri/scripts
    let dev_path = std::path::PathBuf::from("src-tauri/scripts");
    if dev_path.exists() {
        return dev_path;
    }

    // 4. 备用：当前目录下的 scripts
    std::path::PathBuf::from("scripts")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化脚本引擎
    // 尝试多种方式查找 scripts 目录
    let scripts_dir = locate_scripts_dir();

    println!("脚本目录: {:?}", scripts_dir);

    let script_engine = ScriptEngine::new(scripts_dir);

    tauri::Builder::default()
        .manage(AppState {
            script_engine: Mutex::new(script_engine),
        })
        .invoke_handler(tauri::generate_handler![handle_request, generate_qr_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
