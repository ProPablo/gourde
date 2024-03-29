use std::{sync::Mutex, time::Duration};
use tauri::{
    api::process::{Command as TauriCommand, CommandChild, CommandEvent},
    Manager,
};

use super::Gource;
use anyhow::{bail, Context, Result};

pub struct GourceLinux {
    pub child: Mutex<Option<CommandChild>>,
}
impl GourceLinux {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

impl Gource for GourceLinux {
    fn run_gource<R: tauri::Runtime>(
        &self,
        app: tauri::AppHandle<R>,
        args: Vec<String>,
    ) -> Result<(), String> {
        let res = TauriCommand::new_sidecar("gource")
            .expect("failed to create `my-sidecar` binary command")
            .args(&args)
            .spawn();

        println!("Sidecar result: {:?}", res);
        let res = res.unwrap();
        let command_child: tauri::api::process::CommandChild = res.1;
        let mut rx = res.0;
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stderr(line) => println!("Gource error: {line}"),
                    CommandEvent::Stdout(line) => println!("Gource: {line}"),
                    CommandEvent::Error(_) => todo!(),
                    CommandEvent::Terminated(_) => {
                        app.emit_all("gource-finished", ())
                            .expect("failed to emit event");
                    }
                    _ => todo!(),
                }
            }
        });

        // Using derefence to mut reference to assign to it
        let mut child = self.child.lock().unwrap();
        *child = Some(command_child);
        Ok(())
    }

    fn kill_old_child(&self) -> anyhow::Result<bool, String> {
        match self.child.lock().unwrap().take() {
            Some(child) => {
                println!("Stopping old child");
                return child.kill().map_err(|e| e.to_string()).map(|_| true);
            }
            None => Ok(false),
        }
    }
}
