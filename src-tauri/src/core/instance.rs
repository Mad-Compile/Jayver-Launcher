use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Instance {
    pub id: Uuid,
    pub name: String,
    pub game_directory: PathBuf,
    pub minecraft_version: String,
    pub loader: Option<String>,
}
