mod commands;
mod core;
mod services;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::app::get_app_info,
            commands::instances::list_instances
        ])
        .run(tauri::generate_context!())
        .expect("error while running Jayver");
}
