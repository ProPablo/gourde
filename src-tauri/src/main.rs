// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    os::windows::prelude::AsHandle,
    process::{Child, Command},
    sync::{Arc, Mutex},
};

use anyhow::{bail, Context, Result};
use tauri::api::process::{Command as TauriCommand, CommandChild};
use tauri::{AppHandle, Config, Manager, Runtime, State};

type SharedChild = Arc<Child>;
type ChildContainer = Mutex<Option<SharedChild>>;

struct GourceContainer {
    child: ChildContainer,
}

fn kill_old_child(containter: &GourceContainer) -> Result<bool, String> {
    let mut maybe_child = containter.child.lock();
    match &mut maybe_child {
        Ok(maybe_child) => match maybe_child.take() {
            Some( old_thread) => {
                println!("Stopping old child");
                old_thread.kill().map_err(|e| e.to_string()).map(|_| true)
            }
            None => Ok(false),
        },
        Err(e) => Err("Failed to lock mutex".to_string()),
    }
}

#[tauri::command]
fn kill_child(state: State<'_, GourceContainer>) -> Result<bool, String> {
    // State.Inner gives access to the struct inside the state as a reference in case
    kill_old_child(&state.inner())
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
            let  inner = state.inner();
            if let Err(e) = kill_old_child(inner) {
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
                let shared_child = Arc::new(Mutex::new(output));

                let cloned_child = shared_child.clone();

                let t = std::thread::spawn(move || {
                    let _ = cloned_child.lock().unwrap().wait();
                    println!("Gource finished");
                });

                // let mut maybe_child = state.child.lock().unwrap();
                // *maybe_child = Some(shared_child);
            }
            Err(e) => {
                return Err(e.to_string());
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
            let thing: State<'_, GourceContainer> = event.window().state();
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
