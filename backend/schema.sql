-- ============================================================================
-- Trading Platform — schema.sql
-- ============================================================================
-- This file creates raw MySQL tables (evergreen_bot_alert_filter,
-- legacy_bot_alert_filter, admin_users) and runs ALTER TABLE migrations
-- for SQLAlchemy-managed tables.
-- ============================================================================

SET @dbname = DATABASE();

-- ============================================================================
-- evergreen_bot_alert_filter (raw SQL, no SQLAlchemy model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evergreen_bot_alert_filter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user VARCHAR(255) NOT NULL,
    bot VARCHAR(50) NOT NULL DEFAULT 'evergreen',
    Evergreen_EURUSD BOOLEAN DEFAULT FALSE,
    Evergreen_GBPUSD BOOLEAN DEFAULT FALSE,
    Evergreen_EURJPY BOOLEAN DEFAULT FALSE,
    Evergreen_GBPJPY BOOLEAN DEFAULT FALSE,
    Evergreen_EURCHF BOOLEAN DEFAULT FALSE,
    Evergreen_GBPCHF BOOLEAN DEFAULT FALSE,
    Evergreen_EURCAD BOOLEAN DEFAULT FALSE,
    Evergreen_GBPCAD BOOLEAN DEFAULT FALSE,
    Evergreen_EURNZD BOOLEAN DEFAULT FALSE,
    Evergreen_GBPNZD BOOLEAN DEFAULT FALSE,
    Evergreen_EURAUD BOOLEAN DEFAULT FALSE,
    Evergreen_GBPAUD BOOLEAN DEFAULT FALSE,
    Evergreen_AUDUSD BOOLEAN DEFAULT FALSE,
    Evergreen_NZDUSD BOOLEAN DEFAULT FALSE,
    Evergreen_AUDJPY BOOLEAN DEFAULT FALSE,
    Evergreen_NZDJPY BOOLEAN DEFAULT FALSE,
    Evergreen_AUDCHF BOOLEAN DEFAULT FALSE,
    Evergreen_NZDCHF BOOLEAN DEFAULT FALSE,
    Evergreen_AUDCAD BOOLEAN DEFAULT FALSE,
    Evergreen_NZDCAD BOOLEAN DEFAULT FALSE,
    Evergreen_USDCHF BOOLEAN DEFAULT FALSE,
    Evergreen_USDCAD BOOLEAN DEFAULT FALSE,
    Evergreen_XAUUSD BOOLEAN DEFAULT FALSE,
    Evergreen_XAGUSD BOOLEAN DEFAULT FALSE,
    Evergreen_USOIL BOOLEAN DEFAULT FALSE,
    Evergreen_UKOIL BOOLEAN DEFAULT FALSE,
    Evergreen_BTCUSD BOOLEAN DEFAULT FALSE,
    Evergreen_ETHUSD BOOLEAN DEFAULT FALSE,
    Evergreen_BTCUSDT BOOLEAN DEFAULT FALSE,
    Evergreen_ETHUSDT BOOLEAN DEFAULT FALSE,
    Evergreen_NAS100 BOOLEAN DEFAULT FALSE,
    Evergreen_SPX500 BOOLEAN DEFAULT FALSE,
    Evergreen_US30 BOOLEAN DEFAULT FALSE,
    Evergreen_DXY BOOLEAN DEFAULT FALSE,
    Evergreen_BANKNIFTY BOOLEAN DEFAULT FALSE,
    Evergreen_NIFTY BOOLEAN DEFAULT FALSE,
    Evergreen_YM BOOLEAN DEFAULT FALSE,
    Evergreen_NQ BOOLEAN DEFAULT FALSE,
    Evergreen_MYM BOOLEAN DEFAULT FALSE,
    Evergreen_MNQ BOOLEAN DEFAULT FALSE,
    Evergreen_MCL BOOLEAN DEFAULT FALSE,
    Evergreen_MRB BOOLEAN DEFAULT FALSE,
    Evergreen_MES BOOLEAN DEFAULT FALSE,
    Evergreen_CL BOOLEAN DEFAULT FALSE,
    Evergreen_RB BOOLEAN DEFAULT FALSE,
    Evergreen_GC BOOLEAN DEFAULT FALSE,
    Evergreen_SI BOOLEAN DEFAULT FALSE,
    Evergreen_6E BOOLEAN DEFAULT FALSE,
    Evergreen_6B BOOLEAN DEFAULT FALSE,
    Evergreen_6A BOOLEAN DEFAULT FALSE,
    Evergreen_6N BOOLEAN DEFAULT FALSE,
    Evergreen_BTC BOOLEAN DEFAULT FALSE,
    Evergreen_ETH BOOLEAN DEFAULT FALSE,
    Evergreen_ES BOOLEAN DEFAULT FALSE,
    Evergreen_USDJPY BOOLEAN DEFAULT FALSE,
    Evergreen_1M BOOLEAN DEFAULT FALSE,
    Evergreen_5M BOOLEAN DEFAULT FALSE,
    Evergreen_15M BOOLEAN DEFAULT FALSE,
    Evergreen_1H BOOLEAN DEFAULT FALSE,
    Evergreen_4H BOOLEAN DEFAULT FALSE,
    Evergreen_1D BOOLEAN DEFAULT FALSE,
    Evergreen_Bull BOOLEAN DEFAULT FALSE,
    Evergreen_Bear BOOLEAN DEFAULT FALSE,
    Evergreen_Zone BOOLEAN DEFAULT FALSE,
    Evergreen_CR BOOLEAN DEFAULT FALSE,
    Evergreen_CR_OP BOOLEAN DEFAULT FALSE,
    BRK BOOLEAN DEFAULT FALSE,
    BRK_OP BOOLEAN DEFAULT FALSE,
    BRK_Swing_SMT BOOLEAN DEFAULT FALSE,
    BRK_Mitigation_SMT BOOLEAN DEFAULT FALSE,
    BRK_Swing_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    BRK_Swing_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    BRK_Mitigation_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    BRK_Mitigation_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    CISD BOOLEAN DEFAULT FALSE,
    CISD_OP BOOLEAN DEFAULT FALSE,
    CISD_Swing_SMT BOOLEAN DEFAULT FALSE,
    CISD_Mitigation_SMT BOOLEAN DEFAULT FALSE,
    CISD_Swing_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    CISD_Swing_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    CISD_Mitigation_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    CISD_Mitigation_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    CISD_PCL BOOLEAN DEFAULT FALSE,
    CISD_PCL_OP BOOLEAN DEFAULT FALSE,
    CISD_PCL_Swing_SMT BOOLEAN DEFAULT FALSE,
    CISD_PCL_Mitigation_SMT BOOLEAN DEFAULT FALSE,
    CISD_PCL_Swing_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    CISD_PCL_Swing_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    CISD_PCL_Mitigation_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    CISD_PCL_Mitigation_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (bot) REFERENCES bots(bot_id) ON DELETE CASCADE
);

-- ============================================================================
-- legacy_bot_alert_filter (raw SQL, no SQLAlchemy model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS legacy_bot_alert_filter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user VARCHAR(255) NOT NULL,
    bot VARCHAR(50) NOT NULL DEFAULT 'legacy',
    Legacy_EURUSD BOOLEAN DEFAULT FALSE,
    Legacy_GBPUSD BOOLEAN DEFAULT FALSE,
    Legacy_EURJPY BOOLEAN DEFAULT FALSE,
    Legacy_GBPJPY BOOLEAN DEFAULT FALSE,
    Legacy_EURCHF BOOLEAN DEFAULT FALSE,
    Legacy_GBPCHF BOOLEAN DEFAULT FALSE,
    Legacy_EURCAD BOOLEAN DEFAULT FALSE,
    Legacy_GBPCAD BOOLEAN DEFAULT FALSE,
    Legacy_EURNZD BOOLEAN DEFAULT FALSE,
    Legacy_GBPNZD BOOLEAN DEFAULT FALSE,
    Legacy_EURAUD BOOLEAN DEFAULT FALSE,
    Legacy_GBPAUD BOOLEAN DEFAULT FALSE,
    Legacy_AUDUSD BOOLEAN DEFAULT FALSE,
    Legacy_NZDUSD BOOLEAN DEFAULT FALSE,
    Legacy_AUDJPY BOOLEAN DEFAULT FALSE,
    Legacy_NZDJPY BOOLEAN DEFAULT FALSE,
    Legacy_AUDCHF BOOLEAN DEFAULT FALSE,
    Legacy_NZDCHF BOOLEAN DEFAULT FALSE,
    Legacy_AUDCAD BOOLEAN DEFAULT FALSE,
    Legacy_NZDCAD BOOLEAN DEFAULT FALSE,
    Legacy_USDCHF BOOLEAN DEFAULT FALSE,
    Legacy_USDCAD BOOLEAN DEFAULT FALSE,
    Legacy_XAUUSD BOOLEAN DEFAULT FALSE,
    Legacy_XAGUSD BOOLEAN DEFAULT FALSE,
    Legacy_USOIL BOOLEAN DEFAULT FALSE,
    Legacy_UKOIL BOOLEAN DEFAULT FALSE,
    Legacy_BTCUSD BOOLEAN DEFAULT FALSE,
    Legacy_ETHUSD BOOLEAN DEFAULT FALSE,
    Legacy_BTCUSDT BOOLEAN DEFAULT FALSE,
    Legacy_ETHUSDT BOOLEAN DEFAULT FALSE,
    Legacy_NAS100 BOOLEAN DEFAULT FALSE,
    Legacy_SPX500 BOOLEAN DEFAULT FALSE,
    Legacy_US30 BOOLEAN DEFAULT FALSE,
    Legacy_DXY BOOLEAN DEFAULT FALSE,
    Legacy_BANKNIFTY BOOLEAN DEFAULT FALSE,
    Legacy_NIFTY BOOLEAN DEFAULT FALSE,
    Legacy_YM BOOLEAN DEFAULT FALSE,
    Legacy_NQ BOOLEAN DEFAULT FALSE,
    Legacy_MYM BOOLEAN DEFAULT FALSE,
    Legacy_MNQ BOOLEAN DEFAULT FALSE,
    Legacy_MCL BOOLEAN DEFAULT FALSE,
    Legacy_MRB BOOLEAN DEFAULT FALSE,
    Legacy_MES BOOLEAN DEFAULT FALSE,
    Legacy_CL BOOLEAN DEFAULT FALSE,
    Legacy_RB BOOLEAN DEFAULT FALSE,
    Legacy_GC BOOLEAN DEFAULT FALSE,
    Legacy_SI BOOLEAN DEFAULT FALSE,
    Legacy_6E BOOLEAN DEFAULT FALSE,
    Legacy_6B BOOLEAN DEFAULT FALSE,
    Legacy_6A BOOLEAN DEFAULT FALSE,
    Legacy_6N BOOLEAN DEFAULT FALSE,
    Legacy_BTC BOOLEAN DEFAULT FALSE,
    Legacy_ETH BOOLEAN DEFAULT FALSE,
    Legacy_ES BOOLEAN DEFAULT FALSE,
    Legacy_USDJPY BOOLEAN DEFAULT FALSE,
    Legacy_1M BOOLEAN DEFAULT FALSE,
    Legacy_5M BOOLEAN DEFAULT FALSE,
    Legacy_15M BOOLEAN DEFAULT FALSE,
    Legacy_1H BOOLEAN DEFAULT FALSE,
    Legacy_4H BOOLEAN DEFAULT FALSE,
    Legacy_1D BOOLEAN DEFAULT FALSE,
    Legacy_Bull BOOLEAN DEFAULT FALSE,
    Legacy_Bear BOOLEAN DEFAULT FALSE,
    Legacy_Zone BOOLEAN DEFAULT FALSE,
    Legacy_CR BOOLEAN DEFAULT FALSE,
    Legacy_CR_OP BOOLEAN DEFAULT FALSE,
    Legacy_CR_First_Class BOOLEAN DEFAULT FALSE,
    Legacy_CR_TPR BOOLEAN DEFAULT FALSE,
    LCY BOOLEAN DEFAULT FALSE,
    LCY_OP BOOLEAN DEFAULT FALSE,
    LCY_First_Class BOOLEAN DEFAULT FALSE,
    LCY_TPR BOOLEAN DEFAULT FALSE,
    LCY_Swing_SMT BOOLEAN DEFAULT FALSE,
    LCY_Mitigation_SMT BOOLEAN DEFAULT FALSE,
    LCY_Swing_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    LCY_Swing_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    LCY_Mitigation_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    LCY_Mitigation_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    LCY_Sweep BOOLEAN DEFAULT FALSE,
    LCY_Sweep_OP BOOLEAN DEFAULT FALSE,
    LCY_Sweep_First_Class BOOLEAN DEFAULT FALSE,
    LCY_Sweep_TPR BOOLEAN DEFAULT FALSE,
    LCY_Sweep_Swing_SMT BOOLEAN DEFAULT FALSE,
    LCY_Sweep_Mitigation_SMT BOOLEAN DEFAULT FALSE,
    LCY_Sweep_Swing_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    LCY_Sweep_Swing_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    LCY_Sweep_Mitigation_Strong_SMT_BUY BOOLEAN DEFAULT FALSE,
    LCY_Sweep_Mitigation_Weak_SMT_SELL BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (bot) REFERENCES bots(bot_id) ON DELETE CASCADE
);

-- ============================================================================
-- Migrate data from old signal_users table (if it exists)
-- ============================================================================

SET @old_table_exists = (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'signal_users'
);

-- Copy Evergreen data (skip Access column — access is now determined by bot_members expiry)
SET @sql = IF(@old_table_exists > 0,
    'INSERT IGNORE INTO evergreen_bot_alert_filter (user, bot, Evergreen_EURUSD, Evergreen_GBPUSD, Evergreen_EURJPY, Evergreen_GBPJPY, Evergreen_EURCHF, Evergreen_GBPCHF, Evergreen_EURCAD, Evergreen_GBPCAD, Evergreen_EURNZD, Evergreen_GBPNZD, Evergreen_EURAUD, Evergreen_GBPAUD, Evergreen_AUDUSD, Evergreen_NZDUSD, Evergreen_AUDJPY, Evergreen_NZDJPY, Evergreen_AUDCHF, Evergreen_NZDCHF, Evergreen_AUDCAD, Evergreen_NZDCAD, Evergreen_USDCHF, Evergreen_USDCAD, Evergreen_XAUUSD, Evergreen_XAGUSD, Evergreen_USOIL, Evergreen_UKOIL, Evergreen_BTCUSD, Evergreen_ETHUSD, Evergreen_BTCUSDT, Evergreen_ETHUSDT, Evergreen_NAS100, Evergreen_SPX500, Evergreen_US30, Evergreen_DXY, Evergreen_BANKNIFTY, Evergreen_NIFTY, Evergreen_YM, Evergreen_NQ, Evergreen_MYM, Evergreen_MNQ, Evergreen_MCL, Evergreen_MRB, Evergreen_MES, Evergreen_CL, Evergreen_RB, Evergreen_GC, Evergreen_SI, Evergreen_6E, Evergreen_6B, Evergreen_6A, Evergreen_6N, Evergreen_BTC, Evergreen_ETH, Evergreen_ES, Evergreen_USDJPY, Evergreen_1M, Evergreen_5M, Evergreen_15M, Evergreen_1H, Evergreen_4H, Evergreen_1D, Evergreen_Bull, Evergreen_Bear, Evergreen_Zone, Evergreen_CR, Evergreen_CR_OP, BRK, BRK_OP, BRK_Swing_SMT, BRK_Mitigation_SMT, BRK_Swing_Strong_SMT_BUY, BRK_Swing_Weak_SMT_SELL, BRK_Mitigation_Strong_SMT_BUY, BRK_Mitigation_Weak_SMT_SELL, CISD, CISD_OP, CISD_Swing_SMT, CISD_Mitigation_SMT, CISD_Swing_Strong_SMT_BUY, CISD_Swing_Weak_SMT_SELL, CISD_Mitigation_Strong_SMT_BUY, CISD_Mitigation_Weak_SMT_SELL, CISD_PCL, CISD_PCL_OP, CISD_PCL_Swing_SMT, CISD_PCL_Mitigation_SMT, CISD_PCL_Swing_Strong_SMT_BUY, CISD_PCL_Swing_Weak_SMT_SELL, CISD_PCL_Mitigation_Strong_SMT_BUY, CISD_PCL_Mitigation_Weak_SMT_SELL) SELECT user, ''evergreen'', Evergreen_EURUSD, Evergreen_GBPUSD, Evergreen_EURJPY, Evergreen_GBPJPY, Evergreen_EURCHF, Evergreen_GBPCHF, Evergreen_EURCAD, Evergreen_GBPCAD, Evergreen_EURNZD, Evergreen_GBPNZD, Evergreen_EURAUD, Evergreen_GBPAUD, Evergreen_AUDUSD, Evergreen_NZDUSD, Evergreen_AUDJPY, Evergreen_NZDJPY, Evergreen_AUDCHF, Evergreen_NZDCHF, Evergreen_AUDCAD, Evergreen_NZDCAD, Evergreen_USDCHF, Evergreen_USDCAD, Evergreen_XAUUSD, Evergreen_XAGUSD, Evergreen_USOIL, Evergreen_UKOIL, Evergreen_BTCUSD, Evergreen_ETHUSD, Evergreen_BTCUSDT, Evergreen_ETHUSDT, Evergreen_NAS100, Evergreen_SPX500, Evergreen_US30, Evergreen_DXY, Evergreen_BANKNIFTY, Evergreen_NIFTY, Evergreen_YM, Evergreen_NQ, Evergreen_MYM, Evergreen_MNQ, Evergreen_MCL, Evergreen_MRB, Evergreen_MES, Evergreen_CL, Evergreen_RB, Evergreen_GC, Evergreen_SI, Evergreen_6E, Evergreen_6B, Evergreen_6A, Evergreen_6N, Evergreen_BTC, Evergreen_ETH, Evergreen_ES, Evergreen_USDJPY, Evergreen_1M, Evergreen_5M, Evergreen_15M, Evergreen_1H, Evergreen_4H, Evergreen_1D, Evergreen_Bull, Evergreen_Bear, Evergreen_Zone, Evergreen_CR, Evergreen_CR_OP, BRK, BRK_OP, BRK_Swing_SMT, BRK_Mitigation_SMT, BRK_Swing_Strong_SMT_BUY, BRK_Swing_Weak_SMT_SELL, BRK_Mitigation_Strong_SMT_BUY, BRK_Mitigation_Weak_SMT_SELL, CISD, CISD_OP, CISD_Swing_SMT, CISD_Mitigation_SMT, CISD_Swing_Strong_SMT_BUY, CISD_Swing_Weak_SMT_SELL, CISD_Mitigation_Strong_SMT_BUY, CISD_Mitigation_Weak_SMT_SELL, CISD_PCL, CISD_PCL_OP, CISD_PCL_Swing_SMT, CISD_PCL_Mitigation_SMT, CISD_PCL_Swing_Strong_SMT_BUY, CISD_PCL_Swing_Weak_SMT_SELL, CISD_PCL_Mitigation_Strong_SMT_BUY, CISD_PCL_Mitigation_Weak_SMT_SELL FROM signal_users',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Copy Legacy data (skip Access column — access is now determined by bot_members expiry)
SET @sql = IF(@old_table_exists > 0,
    'INSERT IGNORE INTO legacy_bot_alert_filter (user, bot, Legacy_EURUSD, Legacy_GBPUSD, Legacy_EURJPY, Legacy_GBPJPY, Legacy_EURCHF, Legacy_GBPCHF, Legacy_EURCAD, Legacy_GBPCAD, Legacy_EURNZD, Legacy_GBPNZD, Legacy_EURAUD, Legacy_GBPAUD, Legacy_AUDUSD, Legacy_NZDUSD, Legacy_AUDJPY, Legacy_NZDJPY, Legacy_AUDCHF, Legacy_NZDCHF, Legacy_AUDCAD, Legacy_NZDCAD, Legacy_USDCHF, Legacy_USDCAD, Legacy_XAUUSD, Legacy_XAGUSD, Legacy_USOIL, Legacy_UKOIL, Legacy_BTCUSD, Legacy_ETHUSD, Legacy_BTCUSDT, Legacy_ETHUSDT, Legacy_NAS100, Legacy_SPX500, Legacy_US30, Legacy_DXY, Legacy_BANKNIFTY, Legacy_NIFTY, Legacy_YM, Legacy_NQ, Legacy_MYM, Legacy_MNQ, Legacy_MCL, Legacy_MRB, Legacy_MES, Legacy_CL, Legacy_RB, Legacy_GC, Legacy_SI, Legacy_6E, Legacy_6B, Legacy_6A, Legacy_6N, Legacy_BTC, Legacy_ETH, Legacy_ES, Legacy_USDJPY, Legacy_1M, Legacy_5M, Legacy_15M, Legacy_1H, Legacy_4H, Legacy_1D, Legacy_Bull, Legacy_Bear, Legacy_Zone, Legacy_CR, Legacy_CR_OP, Legacy_CR_First_Class, Legacy_CR_TPR, LCY, LCY_OP, LCY_First_Class, LCY_TPR, LCY_Swing_SMT, LCY_Mitigation_SMT, LCY_Swing_Strong_SMT_BUY, LCY_Swing_Weak_SMT_SELL, LCY_Mitigation_Strong_SMT_BUY, LCY_Mitigation_Weak_SMT_SELL, LCY_Sweep, LCY_Sweep_OP, LCY_Sweep_First_Class, LCY_Sweep_TPR, LCY_Sweep_Swing_SMT, LCY_Sweep_Mitigation_SMT, LCY_Sweep_Swing_Strong_SMT_BUY, LCY_Sweep_Swing_Weak_SMT_SELL, LCY_Sweep_Mitigation_Strong_SMT_BUY, LCY_Sweep_Mitigation_Weak_SMT_SELL) SELECT user, ''legacy'', Legacy_EURUSD, Legacy_GBPUSD, Legacy_EURJPY, Legacy_GBPJPY, Legacy_EURCHF, Legacy_GBPCHF, Legacy_EURCAD, Legacy_GBPCAD, Legacy_EURNZD, Legacy_GBPNZD, Legacy_EURAUD, Legacy_GBPAUD, Legacy_AUDUSD, Legacy_NZDUSD, Legacy_AUDJPY, Legacy_NZDJPY, Legacy_AUDCHF, Legacy_NZDCHF, Legacy_AUDCAD, Legacy_NZDCAD, Legacy_USDCHF, Legacy_USDCAD, Legacy_XAUUSD, Legacy_XAGUSD, Legacy_USOIL, Legacy_UKOIL, Legacy_BTCUSD, Legacy_ETHUSD, Legacy_BTCUSDT, Legacy_ETHUSDT, Legacy_NAS100, Legacy_SPX500, Legacy_US30, Legacy_DXY, Legacy_BANKNIFTY, Legacy_NIFTY, Legacy_YM, Legacy_NQ, Legacy_MYM, Legacy_MNQ, Legacy_MCL, Legacy_MRB, Legacy_MES, Legacy_CL, Legacy_RB, Legacy_GC, Legacy_SI, Legacy_6E, Legacy_6B, Legacy_6A, Legacy_6N, Legacy_BTC, Legacy_ETH, Legacy_ES, Legacy_USDJPY, Legacy_1M, Legacy_5M, Legacy_15M, Legacy_1H, Legacy_4H, Legacy_1D, Legacy_Bull, Legacy_Bear, Legacy_Zone, Legacy_CR, Legacy_CR_OP, Legacy_CR_First_Class, Legacy_CR_TPR, LCY, LCY_OP, LCY_First_Class, LCY_TPR, LCY_Swing_SMT, LCY_Mitigation_SMT, LCY_Swing_Strong_SMT_BUY, LCY_Swing_Weak_SMT_SELL, LCY_Mitigation_Strong_SMT_BUY, LCY_Mitigation_Weak_SMT_SELL, LCY_Sweep, LCY_Sweep_OP, LCY_Sweep_First_Class, LCY_Sweep_TPR, LCY_Sweep_Swing_SMT, LCY_Sweep_Mitigation_SMT, LCY_Sweep_Swing_Strong_SMT_BUY, LCY_Sweep_Swing_Weak_SMT_SELL, LCY_Sweep_Mitigation_Strong_SMT_BUY, LCY_Sweep_Mitigation_Weak_SMT_SELL FROM signal_users',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old table after migration
SET @sql = IF(@old_table_exists > 0,
    'DROP TABLE IF EXISTS signal_users',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- admin_users (raw SQL + SQLAlchemy model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    token_expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- users — ALTER TABLE migrations
-- ============================================================================

-- Add columns that may not exist yet
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'firstname') = 0,
    'ALTER TABLE users ADD COLUMN firstname VARCHAR(255) DEFAULT \'\' AFTER username',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'lastname') = 0,
    'ALTER TABLE users ADD COLUMN lastname VARCHAR(255) DEFAULT \'\' AFTER firstname',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add UNIQUE to existing nullable columns
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'tvid') > 0,
    'ALTER TABLE users MODIFY COLUMN tvid VARCHAR(255) UNIQUE',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'phone_number') > 0,
    'ALTER TABLE users MODIFY COLUMN phone_number VARCHAR(255) UNIQUE',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'telegram_user_id') > 0,
    'ALTER TABLE users MODIFY COLUMN telegram_user_id VARCHAR(255) UNIQUE',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'discord_user_id') > 0,
    'ALTER TABLE users MODIFY COLUMN discord_user_id VARCHAR(255) UNIQUE',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'discord_chat_id') > 0,
    'ALTER TABLE users MODIFY COLUMN discord_chat_id VARCHAR(255) UNIQUE',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- courses — ALTER TABLE migrations
-- ============================================================================

-- Add columns that may not exist yet
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'long_description') = 0,
    'ALTER TABLE courses ADD COLUMN long_description TEXT AFTER description',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'image') = 0,
    'ALTER TABLE courses ADD COLUMN image TEXT AFTER long_description',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'category') = 0,
    'ALTER TABLE courses ADD COLUMN category VARCHAR(100) DEFAULT ''General'' AFTER image',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'features') = 0,
    'ALTER TABLE courses ADD COLUMN features JSON AFTER category',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'duration_months') = 0,
    'ALTER TABLE courses ADD COLUMN duration_months INT DEFAULT 1 AFTER features',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'lecturer') = 0,
    'ALTER TABLE courses ADD COLUMN lecturer VARCHAR(255) AFTER duration_months',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'difficulty') = 0,
    'ALTER TABLE courses ADD COLUMN difficulty VARCHAR(50) DEFAULT ''Beginner'' AFTER lecturer',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'scheduled_at') = 0,
    'ALTER TABLE courses ADD COLUMN scheduled_at DATETIME AFTER difficulty',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'status') = 0,
    'ALTER TABLE courses ADD COLUMN status VARCHAR(20) DEFAULT ''upcoming'' AFTER scheduled_at',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = 'courses' AND column_name = 'completed_at') = 0,
    'ALTER TABLE courses ADD COLUMN completed_at DATETIME AFTER status',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- lessons (managed by SQLAlchemy Lesson model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    title VARCHAR(255),
    type VARCHAR(50) DEFAULT 'youtube',
    link TEXT,
    duration VARCHAR(50),
    start_time DATETIME,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Drop old tables that are no longer needed
DROP TABLE IF EXISTS course_waitlist;
DROP TABLE IF EXISTS batch_template;
DROP TABLE IF EXISTS batch_list;
DROP TABLE IF EXISTS course_schedule;
DROP TABLE IF EXISTS course_progress;
DROP TABLE IF EXISTS purchases;

-- ============================================================================
-- course_members
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    expiry DATETIME,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_course_user (username, course_id)
);

-- ============================================================================
-- indicator_members
-- ============================================================================

CREATE TABLE IF NOT EXISTS indicator_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    indicator_id VARCHAR(50) NOT NULL,
    expiry DATETIME,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_indicator_user (username, indicator_id)
);

-- ============================================================================
-- bot_members
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    bot_id VARCHAR(50) NOT NULL,
    expiry DATETIME,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_bot_user (username, bot_id)
);

-- ============================================================================
-- transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    product_section ENUM('Course', 'Discord', 'Indicator', 'Bot') NOT NULL,
    course_id VARCHAR(50),
    indicator_id VARCHAR(50),
    bot_id VARCHAR(50),
    expiry DATETIME,
    amount DECIMAL(10, 2) DEFAULT 0.00,
    method VARCHAR(50) DEFAULT 'Other',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);
