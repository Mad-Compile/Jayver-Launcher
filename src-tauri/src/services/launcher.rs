use crate::core::launch::LaunchProgress;
use tokio::sync::broadcast;

pub struct LaunchEventBus {
    sender: broadcast::Sender<LaunchProgress>,
}

impl LaunchEventBus {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity.max(16));
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<LaunchProgress> {
        self.sender.subscribe()
    }

    pub fn publish(&self, event: LaunchProgress) {
        let _ = self.sender.send(event);
    }
}
