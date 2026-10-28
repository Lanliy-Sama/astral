//! Astral (Tauri + Svelte 5 移植版) 应用壳
//!
//! 对应原 Flutter 工程:
//! - lib/core/platform/window_manager.dart → 窗口初始化 (无边框, 居中)
//! - lib/shared/widgets/common/windows_controls.dart → 托盘 + 关闭最小化
//! - lib/src/rust/api/** → Tauri command
//!
//! 命令集有两种实现, 编译期二选一:
//!   * 默认: commands.rs 的确定性 mock, 用于驱动/预览完整 UI
//!   * `--features real-backend`: backend.rs, 转调 rust/src/api/** 的真实 EasyTier 核心

pub mod commands;
pub mod tray;

#[cfg(feature = "real-backend")]
pub mod backend;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(commands::AppState::default());

    #[cfg(feature = "real-backend")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        // ---- simple (EasyTier 单实例) ----
        backend::easytier_version,
        backend::is_easytier_running,
        backend::get_ips,
        backend::get_running_info,
        backend::create_server,
        backend::close_server,
        backend::get_network_status,
        backend::init_app,
        // ---- nat ----
        backend::test_network_connectivity,
        backend::detect_nat_type,
        // ---- firewall ----
        backend::get_firewall_status,
        backend::set_firewall_status,
        // ---- hops ----
        backend::get_all_interfaces_metrics,
        backend::set_interface_metric,
        backend::check_sudo,
        // ---- magic wall ----
        backend::start_magic_wall,
        backend::stop_magic_wall,
        backend::add_magic_wall_rule,
        backend::remove_magic_wall_rule,
        backend::update_magic_wall_rule,
        backend::get_magic_wall_status,
        backend::get_nt_path,
        // ---- misc ----
        backend::ping_server,
        backend::has_npcap_driver,
        // ---- window (与后端实现无关) ----
        commands::minimize_window,
        commands::toggle_maximize,
        commands::close_window,
        commands::is_maximized,
    ]);

    #[cfg(not(feature = "real-backend"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        // ---- simple (EasyTier 单实例) ----
        commands::easytier_version,
        commands::is_easytier_running,
        commands::get_ips,
        commands::get_running_info,
        commands::create_server,
        commands::close_server,
        commands::get_network_status,
        commands::init_app,
        // ---- nat ----
        commands::test_network_connectivity,
        commands::detect_nat_type,
        // ---- firewall ----
        commands::get_firewall_status,
        commands::set_firewall_status,
        // ---- hops ----
        commands::get_all_interfaces_metrics,
        commands::set_interface_metric,
        commands::check_sudo,
        // ---- magic wall ----
        commands::start_magic_wall,
        commands::stop_magic_wall,
        commands::add_magic_wall_rule,
        commands::remove_magic_wall_rule,
        commands::update_magic_wall_rule,
        commands::get_magic_wall_status,
        commands::get_nt_path,
        // ---- misc ----
        commands::ping_server,
        commands::has_npcap_driver,
        // ---- window ----
        commands::minimize_window,
        commands::toggle_maximize,
        commands::close_window,
        commands::is_maximized,
    ]);

    builder
        .setup(|app| {
            // 托盘 (显示主界面 / 隐藏托盘 / 退出)
            tray::setup_tray(app)?;
            // 关闭行为: 由前端 windowState.closeMinimize 控制,
            // 默认 (true) 隐藏到托盘而不是退出 — 对应原 onWindowClose 逻辑。
            tray::setup_close_behavior(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running astral-tauri");
}
