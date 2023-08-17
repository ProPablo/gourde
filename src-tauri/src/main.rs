// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    process::{Child, Command},
    sync::{Arc, Mutex},
};
mod gource;
mod open_explorer;

use anyhow::{bail, Context, Result};
use tauri::api::process::{Command as TauriCommand, CommandChild};
use tauri::{AppHandle, Config, Manager, Runtime, State};
// SharedChild is very much needed becuase even tauri uses it, see https://crates.io/crates/shared_child
use shared_child::SharedChild;

use gource::{Gource, GourceContainer};

// type ChildContainer = Mutex<Option<Arc<SharedChild>>>;
// struct GourceContainer {
//     child: ChildContainer,
// }

#[tauri::command]
fn kill_child(state: State<'_, GourceContainer>) -> Result<bool, String> {
    state.kill_old_child()
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

    state.run_gource(app, args)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_gource, kill_child, open_explorer::show_in_folder])
        .manage(GourceContainer {
            // child: Arc::new(Mutex::new(None)),
            child: Mutex::new(None),
        })
        // https://github.com/tauri-apps/tauri/discussions/3273
        .on_window_event(move |event| match event.event() {
            tauri::WindowEvent::Destroyed => {
                println!("Window is closing");

                #[cfg(windows)]
                {
                    let state: State<'_, GourceContainer> = event.window().state();
                    state.kill_old_child();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
