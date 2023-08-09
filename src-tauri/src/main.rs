// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    process::{Child, Command},
    sync::{Arc, Mutex},
};
mod gource;

use anyhow::{bail, Context, Result};
use tauri::api::process::{Command as TauriCommand, CommandChild};
use tauri::{AppHandle, Config, Manager, Runtime, State};
// SharedChild is very much needed becuase even tauri uses it, see https://crates.io/crates/shared_child
use shared_child::SharedChild;


type ChildContainer = Mutex<Option<Arc<SharedChild>>>;
struct GourceContainer {
    child: ChildContainer,
}


fn kill_old_child(containter: &ChildContainer) -> Result<bool, String> {

    match containter.lock().unwrap().take() {
        Some(child) => {
            println!("Stopping old child");
            child.kill().map_err(|e| e.to_string()).map(|_| true)
                // Ok(child) => child.kill().map_err(|e| e.to_string()).map(|_| true),
                // Err(e) => Err("Failed to lock mutex".to_string()),
            }
        None => Ok(false),
    }
}

#[tauri::command]
fn kill_child(state: State<'_, GourceContainer>) -> Result<bool, String> {
    // State.Inner gives access to the struct inside the state as a reference in case
    // Be better if u just passed around teh state (arc) clone
    kill_old_child(&state.inner().child)
}

enum FolderResult {
    GitRepo,
    NotGitRepo,
    NotFolder,
}

async fn is_file_git_repo(path: &str) -> FolderResult {
    let mut git_path = std::path::PathBuf::from(path);
    if (!git_path.is_dir()) {
        return FolderResult::NotFolder;
    }
    git_path.push(".git");
    if (git_path.exists()) {
        return FolderResult::GitRepo;
    } else {
        return FolderResult::NotGitRepo;
    }
}


#[tauri::command]
async fn run_gource<'a, R: Runtime>(
    app: AppHandle<R>,
    args: Vec<String>,
    state: State<'a, GourceContainer>,
) -> Result<(), String> {
    match is_file_git_repo(&args[0]).await {
        FolderResult::GitRepo => {}
        FolderResult::NotGitRepo => {
            return Err("Not a git repo".to_string());
        }
        FolderResult::NotFolder => {
            return Err("Not a folder".to_string());
        }
    }

    {
        let inner = state.inner();
        if let Err(e) = kill_old_child(&inner.child) {
            return Err(e.to_string());
        }
    }

    let mut gource_path = tauri::api::path::resource_dir(app.package_info(), &app.env()).unwrap();
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
            // let app_clone = app.clone();

            let t = std::thread::spawn(move || {
                let res = cloned_child.wait();

                app
                    .emit_all("gource-finished", ())
                    .expect("failed to emit event");

                println!("Gource finished");
            });

            let mut maybe_child = state.child.lock().unwrap();
            *maybe_child = Some(shared_child);
        }
        Err(e) => {
            let error_string = format!("Failed to run gource: {}", e);

            // This returns an anyhow Error which is not the same as Err(string)
            // return anyhow::anyhow!( error_string );

            //This returns Err(anyhow::Error) which is not the same as Err(string)
            // return Err(anyhow::anyhow!( error_string ));

            return Err(anyhow::anyhow!( error_string ).to_string());
        }
    }
    Ok(())
}

fn run_gource_not_win(args: Vec<String>, child: &mut Option<CommandChild>) {
    let res = TauriCommand::new_sidecar("gource")
        .expect("failed to create `my-sidecar` binary command")
        .args(&args)
        .spawn();

    println!("{:?}", res);
    let command_child: tauri::api::process::CommandChild = res.unwrap().1;
    // Using derefence to mut reference to assign to it
    *child = Some(command_child);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_gource, kill_child])
        .manage(GourceContainer {
            // child: Arc::new(Mutex::new(None)),
            child: Mutex::new(None),
        })
        // https://github.com/tauri-apps/tauri/discussions/3273
        .on_window_event(move |event| {
            match event.event() {
                tauri::WindowEvent::Destroyed => {
                    println!("Window is closing");
                    let thing: State<'_, GourceContainer> = event.window().state();
                    kill_old_child(&thing.inner().child).unwrap();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
