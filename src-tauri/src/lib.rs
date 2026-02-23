#[tauri::command]
fn set_display_mode(window: tauri::Window, mode: String) {
    match mode.as_str() {
        "fullscreen" => {
            window.set_decorations(true).ok();
            window.set_fullscreen(true).ok();
        }
        "borderless" => {
            window.set_fullscreen(false).ok();
            window.set_decorations(false).ok();
            window.maximize().ok();
        }
        "windowed" | _ => {
            window.set_fullscreen(false).ok();
            window.set_decorations(true).ok();
            window.unmaximize().ok();
            window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(1280, 720))).ok();
            window.center().ok();
        }
    }
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::Window) {
    let is_fs = window.is_fullscreen().unwrap_or(false);
    window.set_fullscreen(!is_fs).ok();
}

#[tauri::command]
fn is_fullscreen(window: tauri::Window) -> bool {
    window.is_fullscreen().unwrap_or(false)
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebKit2GTK on Linux: enable hardware-accelerated rendering
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_display_mode,
            toggle_fullscreen,
            is_fullscreen,
            quit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
