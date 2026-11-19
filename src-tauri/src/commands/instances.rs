use crate::{core::instance::Instance, state::AppState};
use tauri::State;

#[tauri::command]
pub async fn list_instances(_state: State<'_, AppState>) -> Result<Vec<Instance>, String> {
    // Replace with the persistent instance repository; keep IPC stable meanwhile.
    Ok(Vec::new())
}
