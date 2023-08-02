// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    process::{Child, Command},
    sync::Mutex,
};

use anyhow::{bail, Context, Result};
use tauri::api::process::{Command as TauriCommand, CommandChild};
use tauri::{AppHandle, Config, Manager, Runtime, State};

struct GourceContainer {
    #[cfg(windows)]
    child: Mutex<Option<Child>>,
    #[cfg(not(windows))]
    child: Mutex<Option<CommandChild>>,
}

fn kill_old_child(
    #[cfg(not(windows))] maybe_old_child: &mut Option<TauriCommand>,
    #[cfg(windows)] maybe_old_child: &mut Option<Child>,
) -> Result<bool> {
    match maybe_old_child.take() {
        Some(mut old_thread) => {
            println!("Stopping old child");
            let res = old_thread.kill()?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
async fn kill_child(state: State<'_, GourceContainer>) -> Result<(), String> {
    let mut maybe_child = state.child.lock();
    if let Ok(maybe_child) = &mut maybe_child {
        match kill_old_child(maybe_child) {
            Ok(_) => return Ok(()),
            Err(e) => return Err(e.to_string()),
        }
    }
    Err("Failed to lock mutex".to_string())
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
async fn run_gource<R: Runtime>(
    app: AppHandle<R>,
    args: Vec<String>,
    state: State<'_, GourceContainer>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        {
            let mut maybe_child = state.child.lock().unwrap();
            if let Err(e) = kill_old_child(&mut maybe_child) {
                return Err(e.to_string());
            }
        }
        match is_file_git_repo(&args[0]).await {
            FolderResult::GitRepo => {}
            FolderResult::NotGitRepo => {
                return Err("Not a git repo".to_string());
            }
            FolderResult::NotFolder => {
                return Err("Not a folder".to_string());
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

        let output = Command::new(final_string)
            .current_dir(gource_path)
            .args(&args)
            // .arg("D:/rm_dashboard")
            .spawn()
            // Dont expect here since that poisons the mutex, instead return error with string explaining what happend
            .expect("failed to execute process");
        // TODO: make this into an arc that is shared across a thread that monitors when its dead, also works for checking when window is dead, and subbing to on_window_event
        // https://github.com/tauri-apps/tauri/discussions/3273

        let mut maybe_child = state.child.lock().unwrap();
        *maybe_child = Some(output);
    }
    #[cfg(not(windows))]
    {
        run_gource_not_win(args, &mut maybe_child);
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
            child: Mutex::new(None),
        })
        // .on_window_event(move |event| match event)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
