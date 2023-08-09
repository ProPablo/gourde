use std::sync::Arc;

use shared_child::SharedChild;
use tauri::async_runtime::Mutex;

use super::Gource;

type ChildContainer = Mutex<Option<Arc<SharedChild>>>;

pub struct GourceWindows {
    child: ChildContainer,
}

impl Gource for GourceWindows {
    fn run_gource(&self) -> anyhow::Result<(), String> {
        todo!()
    }

    fn kill_old_child(&self) -> anyhow::Result<bool, String> {
        // match self.child.lock().unwrap().take() {
        //     Some(child) => {
        //         println!("Stopping old child");
        //         child.kill().map_err(|e| e.to_string()).map(|_| true)
        //         // Ok(child) => child.kill().map_err(|e| e.to_string()).map(|_| true),
        //         // Err(e) => Err("Failed to lock mutex".to_string()),
        //     }
        //     None => Ok(false),
        // }

        todo!()
    }
}
