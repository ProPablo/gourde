use anyhow::{bail, Context, Result};

pub trait Gource {
    fn run_gource<R: Runtime>(&self, app: AppHandle<R>, args: Vec<String>,) -> Result<(), String>;
    fn kill_old_child(&self) -> Result<bool, String>;
}


#[cfg(windows)]
pub mod windows;


#[cfg(not(windows))]
pub mod linux;

use tauri::{Runtime, AppHandle};
#[cfg(windows)]
pub use windows::GourceWindows as GourceContainer;

#[cfg(not(windows))]
pub use linux::GourceLinux as GourceContainer;