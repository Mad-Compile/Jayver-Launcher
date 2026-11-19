use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LaunchStage {
    Resolving, CheckingJava, Downloading, Preparing, StartingGame, Running, Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchProgress {
    pub operation_id: Uuid,
    pub instance_id: Uuid,
    pub stage: LaunchStage,
    pub completed: u64,
    pub total: Option<u64>,
    pub message: String,
}
