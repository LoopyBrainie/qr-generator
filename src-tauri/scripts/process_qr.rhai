// 数据处理和 QR 码生成（重构版）
// 输入: { id, site_id, class_lesson_id }
// 输出: { qr_data, timestamp, processed }

// ---------------------------------------------------------------------------
// 数据验证函数
// 验证输入字段是否完整且有效，无效时抛出异常
// ---------------------------------------------------------------------------
fn validate_input(id, site_id, class_lesson_id) {
    if id == "" || id == () {
        throw "id is required";
    }
    if site_id == "" || site_id == () {
        throw "site_id is required";
    }
    if class_lesson_id == "" || class_lesson_id == () {
        throw "class_lesson_id is required";
    }
    #{
        id: id,
        site_id: site_id,
        class_lesson_id: class_lesson_id
    }
}

// ---------------------------------------------------------------------------
// QR 码生成函数
// 调用 Rust 端注册的 format_qr_data 构建签到码字符串
// ---------------------------------------------------------------------------
fn generate_qr(id, site_id, class_lesson_id) {
    format_qr_data(id, site_id, class_lesson_id)
}

// ---------------------------------------------------------------------------
// 时间戳函数
// 返回当前毫秒级 UTC 时间戳
// ---------------------------------------------------------------------------
fn create_timestamp() {
    timestamp_ms()
}

// === 主流程 ===

// 1. 验证输入数据
let validated = validate_input(input.id, input.site_id, input.class_lesson_id);

// 2. 生成 QR 码数据
let qr_data = generate_qr(validated.id, validated.site_id, validated.class_lesson_id);

// 3. 获取时间戳
let ts = create_timestamp();

// 4. 返回处理结果（必须赋值给 result 变量）
let result = #{
    qr_data: qr_data,
    timestamp: ts,
    processed: true
};
