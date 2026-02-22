// 示例脚本：数据处理和 QR 码生成
// 输入: { id, site_id, class_lesson_id }
// 输出: { qr_data, timestamp }

// 获取输入数据
let id = input.id;
let site_id = input.site_id;
let class_lesson_id = input.class_lesson_id;

// 调用 Rust 函数生成 QR 码数据
let qr_data = format_qr_data(id, site_id, class_lesson_id);

// 获取当前毫秒级时间戳
let ts = timestamp_ms();

// 返回处理结果（必须赋值给 result 变量）
let result = #{
    qr_data: qr_data,
    timestamp: ts,
    processed: true
};
