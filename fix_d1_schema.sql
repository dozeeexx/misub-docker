-- 修复 D1 数据库表结构
-- 解决 settings 表字段问题

-- 删除现有的 settings 表（如果存在）
DROP TABLE IF EXISTS settings;

-- 重新创建 settings 表，使用正确的 key-value 结构
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 确保其他表存在且结构正确
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 重新创建索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_updated_at ON subscriptions(updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);
