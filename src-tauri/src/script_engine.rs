use rhai::{Dynamic, Engine, AST, Scope};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Rhai 脚本引擎
/// 支持：外部脚本加载、预编译缓存、注册 Rust 函数
pub struct ScriptEngine {
    engine: Engine,
    compiled_scripts: Mutex<HashMap<String, AST>>,
    scripts_dir: PathBuf,
}

impl ScriptEngine {
    /// 创建新的脚本引擎实例
    pub fn new(scripts_dir: PathBuf) -> Self {
        let mut engine = Engine::new();

        // 注册 Rust 函数供脚本调用
        Self::register_functions(&mut engine);

        Self {
            engine,
            compiled_scripts: Mutex::new(HashMap::new()),
            scripts_dir,
        }
    }

    /// 注册 Rust 函数到引擎
    fn register_functions(engine: &mut Engine) {
        // 注册日志函数
        engine.register_fn("log", |msg: &str| {
            println!("[Rhai] {}", msg);
        });

        // 注册获取当前时间戳（秒级）
        engine.register_fn("timestamp", || -> i64 {
            chrono::Utc::now().timestamp()
        });

        // 注册获取当前时间戳（毫秒级）
        engine.register_fn("timestamp_ms", || -> i64 {
            chrono::Utc::now().timestamp_millis()
        });

        // 注册 Base62 编码
        engine.register_fn("base62_encode", |num: i64| -> String {
            const ALPHABET: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            if num == 0 {
                return "0".to_string();
            }
            let mut n = num;
            let mut result = String::new();
            while n > 0 {
                let idx = (n % 62) as usize;
                result.push(ALPHABET[idx] as char);
                n /= 62;
            }
            result.chars().rev().collect()
        });

        // 注册 QR 码数据格式化函数（与原来 generate_qr_code 一致）
        engine.register_fn("format_qr_data", |id: &str, site_id: &str, class_lesson_id: &str| -> String {
            // 获取当前时间，格式化为 ISO 8601 格式（不带 Z）
            let now = chrono::Utc::now();
            let create_time = now.format("%Y-%m-%dT%H:%M:%S%.3f").to_string();
            // 对时间字符串的字节进行 Base62 编码
            let checksum_full = Self::base62_encode_bytes(create_time.as_bytes());
            let checksum_code: String = checksum_full.chars().take(22).collect();

            format!("checkwork|id={}&siteId={}&createTime={}&classLessonId={}", id, site_id, checksum_code, class_lesson_id)
        });
    }

    /// 对字符串字节进行 Base62 编码（与原来 generate_qr_code 一致）
    fn base62_encode_bytes(bytes: &[u8]) -> String {
        use num_bigint::BigUint;
        use num_traits::{ToPrimitive, Zero};

        const CHARSET: &[u8; 62] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        if bytes.is_empty() {
            return "0".to_string();
        }

        let value = BigUint::from_bytes_be(bytes);
        if value.is_zero() {
            return "0".to_string();
        }

        let base = BigUint::from(62u32);
        let mut buffer = Vec::new();
        let mut value = value;
        while !value.is_zero() {
            let remainder = (&value % &base)
                .to_usize()
                .expect("余数应当适配 usize 范围");
            buffer.push(CHARSET[remainder] as char);
            value /= &base;
        }

        buffer.iter().rev().collect()
    }

    /// 加载并执行外部脚本（混合模式：预编译缓存）
    pub fn execute(&self, script_name: &str, input_data: Dynamic) -> Result<Dynamic, String> {
        let compiled = self.get_or_compile_script(script_name)?;

        // 创建作用域并注入输入数据
        let mut scope = Scope::new();
        scope.push_constant("input", input_data.clone());

        // 执行脚本
        if let Err(e) = self.engine.run_ast_with_scope(&mut scope, &compiled) {
            return Err(format!("Script execution error: {:?}", e));
        }

        // 尝试获取结果变量（如果脚本有返回值）
        if let Some(result) = scope.get_value::<Dynamic>("result") {
            return Ok(result);
        }

        // 返回输入数据作为默认值
        Ok(input_data)
    }

    /// 获取或编译脚本（带缓存）
    fn get_or_compile_script(&self, script_name: &str) -> Result<AST, String> {
        // 先检查缓存
        {
            let cache = self.compiled_scripts.lock().map_err(|e| e.to_string())?;
            if let Some(ast) = cache.get(script_name) {
                return Ok(ast.clone());
            }
        }

        // 加载并编译脚本
        let script_path = self.scripts_dir.join(format!("{}.rhai", script_name));
        let script_content = fs::read_to_string(&script_path)
            .map_err(|e| format!("Failed to read script '{}': {}", script_name, e))?;

        let ast = self.engine.compile(&script_content)
            .map_err(|e| format!("Failed to compile script '{}': {:?}", script_name, e))?;

        // 缓存编译结果
        {
            let mut cache = self.compiled_scripts.lock().map_err(|e| e.to_string())?;
            cache.insert(script_name.to_string(), ast.clone());
        }

        Ok(ast)
    }

    /// 执行脚本字符串（不使用缓存，用于动态脚本）
    pub fn execute_string(&self, script: &str, input_data: Dynamic) -> Result<Dynamic, String> {
        // 编译并执行
        let ast = self.engine.compile(script)
            .map_err(|e| format!("Failed to compile script: {:?}", e))?;

        // 创建作用域并注入输入数据
        let mut scope = Scope::new();
        scope.push_constant("input", input_data);

        let result = self.engine.run_ast_with_scope(&mut scope, &ast);

        if let Err(e) = result {
            return Err(format!("Script execution error: {:?}", e));
        }

        Ok(Dynamic::UNIT)
    }

    /// 将 serde_json::Value 转换为 Rhai Dynamic
    pub fn json_to_dynamic(value: &Value) -> Dynamic {
        match value {
            Value::Null => Dynamic::UNIT,
            Value::Bool(b) => Dynamic::from(*b),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Dynamic::from(i)
                } else if let Some(f) = n.as_f64() {
                    Dynamic::from(f)
                } else {
                    Dynamic::from(n.to_string())
                }
            }
            Value::String(s) => Dynamic::from(s.clone()),
            Value::Array(arr) => {
                let mut list = Vec::new();
                for item in arr {
                    list.push(Self::json_to_dynamic(item));
                }
                Dynamic::from(list)
            }
            Value::Object(obj) => {
                let mut map = rhai::Map::new();
                for (k, v) in obj {
                    map.insert(k.clone().into(), Self::json_to_dynamic(v));
                }
                Dynamic::from(map)
            }
        }
    }

    /// 将 Rhai Dynamic 转换为 serde_json::Value
    /// 使用 type_name 来判断类型
    pub fn dynamic_to_json(dynamic: Dynamic) -> Value {
        let type_name = dynamic.type_name();

        match type_name {
            "()" => Value::Null,
            "bool" => Value::Bool(dynamic.as_bool().unwrap_or(false)),
            "i64" | "i32" | "i16" | "i8" | "isize" => {
                let val = dynamic.as_int().unwrap_or(0);
                Value::Number(val.into())
            }
            "f64" | "f32" => {
                let f = dynamic.as_float().unwrap_or(0.0);
                serde_json::Number::from_f64(f)
                    .map(Value::Number)
                    .unwrap_or(Value::Null)
            }
            "string" | "str" | "String" => {
                Value::String(dynamic.to_string())
            }
            "array" | "Array" => {
                // 使用 to_debug 解析
                let debug_str = format!("{:?}", dynamic);
                if debug_str.starts_with('[') {
                    if let Ok(v) = serde_json::from_str::<Value>(&debug_str) {
                        return v;
                    }
                }
                Value::Array(vec![])
            }
            "map" | "Map" => {
                // 使用 to_debug 解析 Rhai Map
                // Rhai Map 格式: #{"key1": value1, "key2": value2}
                let debug_str = format!("{:?}", dynamic);
                // 去掉 # 前缀
                let json_str = debug_str.strip_prefix('#').unwrap_or(&debug_str);
                if let Ok(v) = serde_json::from_str::<Value>(json_str) {
                    return v;
                }
                Value::Object(serde_json::Map::new())
            }
            _ => Value::String(dynamic.to_string()),
        }
    }

    /// 清除脚本缓存
    pub fn clear_cache(&self) {
        if let Ok(mut cache) = self.compiled_scripts.lock() {
            cache.clear();
        }
    }
}
