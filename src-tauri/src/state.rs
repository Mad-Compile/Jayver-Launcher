use std::sync::Arc;
use tokio::sync::Semaphore;

pub struct AppState {
    pub download_slots: Arc<Semaphore>,
}

impl AppState {
    pub fn new() -> Self {
        Self { download_slots: Arc::new(Semaphore::new(8)) }
    }
}
