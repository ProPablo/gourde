
use anyhow::{bail, Context, Result};


pub trait Gource {
    fn run_gource(&self) -> Result<(), String>;
    fn kill_old_child(&self) -> Result<bool, String>;
}



#[cfg(not(windows))]
pub struct GourceLinux {}

#[cfg(windows)]
pub mod windows;


#[cfg(windows)]
pub use windows::GourceWindows as GourceContainer;

#[cfg(not(windows))]
pub use GourceLinux as GourceContainer;
