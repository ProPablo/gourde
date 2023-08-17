use std::{sync::{Arc, Mutex}, process::Command};

use anyhow::{bail, Context, Result};

use shared_child::SharedChild;
use tauri::{Runtime, AppHandle, Manager};

use super::Gource;

type ChildContainer = Mutex<Option<Arc<SharedChild>>>;

pub struct GourceWindows {
    pub child: ChildContainer,
}

impl Gource for GourceWindows {
    fn run_gource<R: Runtime>(&self, app: AppHandle<R>, args: Vec<String>) -> Result<(), String> {
        {
            if let Err(e) = self.kill_old_child() {
                return Err(e.to_string());
            }
        }

        let mut gource_path =
            tauri::api::path::resource_dir(app.package_info(), &app.env()).unwrap();
        gource_path.push("bin/gource");
        let mut gource_bin = gource_path.clone();
        gource_bin.push("gource");
        let final_string = gource_bin
            .to_str()
            .unwrap()
            .to_string()
            // These characters are for long file matching which is unlikley in this case since the location of bin is likely program files, causes resource load error in gource
            .trim_start_matches("\\\\?\\")
            .to_string();
        println!("Gource path:{:?}", final_string);
        let maybe_output = Command::new(final_string)
            .current_dir(gource_path)
            .args(&args)
            .spawn();

        match maybe_output {
            Ok(mut output) => {
                // TODO: make this into an arc that is shared across a thread that monitors when its dead, also works for checking when window is dead, and subbing to on_window_event
                let shared_child = Arc::new(SharedChild::new(output).unwrap());
                let cloned_child = shared_child.clone();

                let t = std::thread::spawn(move || {
                    let res = cloned_child.wait();

                    app.emit_all("gource-finished", ())
                        .expect("failed to emit event");

                    println!("Gource finished");
                });

                let mut maybe_child = self.child.lock().unwrap();
                *maybe_child = Some(shared_child);
            }
            Err(e) => {
                let error_string = format!("Failed to run gource: {}", e);

                // This returns an anyhow Error which is not the same as Err(string)
                // return anyhow::anyhow!( error_string );

                //This returns Err(anyhow::Error) which is not the same as Err(string)
                // return Err(anyhow::anyhow!( error_string ));

                return Err(anyhow::anyhow!(error_string).to_string());
            }
        }
        Ok(())
    }

    fn kill_old_child(&self) -> Result<bool, String> {
        match self.child.lock().unwrap().take() {
            Some(child) => {
                println!("Stopping old child");
                return child.kill().map_err(|e| e.to_string()).map(|_| true);
            }
            None => Ok(false),
        }
    }
}
