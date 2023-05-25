// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    process::{Child, Command},
    sync::Mutex,
};

use anyhow::Result;
use tauri::api::process::Command as TauriCommand;
use tauri::{AppHandle, Config, Manager, Runtime, State};

struct GourceContainer {
    #[cfg(windows)]
    child: Mutex<Option<Child>>,
    #[cfg(not(windows))]
    child: Mutex<Option<TauriCommand>>,
}



fn kill_old_child(#[cfg(not(windows))] maybe_old_child: &mut Option<TauriCommand>, #[cfg(windows)] maybe_old_child: &mut Option<Child>) -> Result<bool> {
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
    let mut maybe_child = state.child.lock().unwrap();
    // TODO: use string as error propogation
    kill_old_child(&mut maybe_child);
    Ok(())
}

#[tauri::command]
async fn run_gource<R: Runtime>(
    app: AppHandle<R>,
    args: Vec<String>,
    state: State<'_, GourceContainer>,
) -> Result<(), String> {
    let mut maybe_child = state.child.lock().unwrap();
    #[cfg(windows)]
    {
        // Ensure directory exists and is git repo before continueing execution
        // TODO: catch error and send err event
        kill_old_child(&mut maybe_child);

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
        *maybe_child = Some(output);
    }
    #[cfg(not(windows))]
    {
        let res: std::result::Result<
            (
                tauri::async_runtime::Receiver<tauri::api::process::CommandEvent>,
                tauri::api::process::CommandChild,
            ),
            tauri::api::Error,
        > = TauriCommand::new_sidecar("gource")
            .expect("failed to create `my-sidecar` binary command")
            .args(&args)
            .spawn();

        println!("{:?}", res);
        let command_child = res.unwrap().1;
    }
    Ok(())
    // ("".to_string())
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
