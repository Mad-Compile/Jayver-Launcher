use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub engine: &'static str,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo { name: "Jayver", version: env!("CARGO_PKG_VERSION"), engine: "tauri" }
}
