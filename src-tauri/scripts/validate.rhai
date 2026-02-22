// 示例脚本：数据验证
// 输入: { field_name: value, ... }
// 输出: { valid: bool, errors: [] }

// 验证函数
fn validate_field(value, field_name, required, min_len, max_len) {
    // 检查必填
    if required && (value == "" || value == ()) {
        return [false, `${field_name} is required`];
    }

    // 检查最小长度
    if min_len > 0 && value.len < min_len {
        return [false, `${field_name} must be at least ${min_len} characters`];
    }

    // 检查最大长度
    if max_len > 0 && value.len > max_len {
        return [false, `${field_name} must be at most ${max_len} characters`];
    }

    [true, ""]
}

let errors = [];
let valid = true;

// 验证 id
let id_result = validate_field(input.id, "id", true, 1, 100);
if !id_result[0] {
    valid = false;
    errors.push(id_result[1]);
}

// 验证 site_id
let site_result = validate_field(input.site_id, "site_id", true, 1, 100);
if !site_result[0] {
    valid = false;
    errors.push(site_result[1]);
}

// 验证 class_lesson_id
let lesson_result = validate_field(input.class_lesson_id, "class_lesson_id", true, 1, 100);
if !lesson_result[0] {
    valid = false;
    errors.push(lesson_result[1]);
}

// 返回验证结果
#{
    valid: valid,
    errors: errors,
    checked_at: timestamp()
}
