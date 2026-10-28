//! 托盘与关闭行为 — 对应原 windows_controls.dart / main_screen.dart (onWindowClose)
//!
//! 托盘菜单: 显示主界面 / 隐藏托盘 / 退出
//! 关闭行为: 前端持久化的 closeMinimize (默认 true) → 隐藏窗口而非退出

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    App, Emitter, Manager,
};

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show_window", "显示主界面", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide_tray", "隐藏托盘", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, "exit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &exit])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Astral")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_window" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "exit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn setup_close_behavior(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // 读取前端 localStorage 的 closeMinimize 由 JS 侧完成;
    // Rust 侧统一注册关闭拦截, 通过事件让前端决定 隐藏/退出。
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    // The handler is registered on `window`, so the closure must own a clone
    // rather than the same value it borrows.
    let handle = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            // 通知前端 (前端根据 closeMinimize 设置决定),
            // 前端调用 destroy 或什么都不做; 默认行为: 隐藏窗口。
            let _ = handle.emit("astral://close-requested", ());
            api.prevent_close();
            let _ = handle.hide();
        }
    });

    Ok(())
}
