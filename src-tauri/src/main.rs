// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    process::{Child, Command},
    sync::Mutex,
};

use anyhow::Result;
use tauri::{AppHandle, Config, Manager, Runtime, State};

struct GourceContainer {
    child: Mutex<Option<Child>>,
}

fn kill_old_child(maybe_old_child: &mut Option<Child>) -> Result<bool> {
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
fn kill_child(state: State<'_, GourceContainer>) {
    let mut maybe_child = state.child.lock().unwrap();
    kill_old_child(&mut maybe_child);
}

#[tauri::command]
async fn run_gource<R: Runtime>(
    app: AppHandle<R>,
    args: Vec<String>,
    state: State<'_, GourceContainer>,
) -> Result<(), String> {
    let mut maybe_child = state.child.lock().unwrap();
    // TODO: catch error and send err event
    kill_old_child(&mut maybe_child);

    // format!("Hello, {}! You've been greeted from Rust!", name)
    let mut gource_path = tauri::api::path::resource_dir(app.package_info(), &app.env()).unwrap();
    gource_path.push("bin/gource");
    let mut gource_bin = gource_path.clone();
    gource_bin.push("gource");
    println!("{:?}", gource_path);
    println!("{:?}", gource_bin);
    let final_string = gource_bin
        .to_str()
        .unwrap()
        .to_string()
        .trim_start_matches("\\\\?\\")
        .to_string();
    println!("{:?}", final_string);

    let output = Command::new(final_string)
        .current_dir(gource_path)
        .args(args)
        // .arg("D:/rm_dashboard")
        .spawn()
        .expect("failed to execute process");
    // TODO: make this into an arc that is shared across a thread that monitors when its dead, also works for checking when window is dead, and subbing to on_window_event
    // https://github.com/tauri-apps/tauri/discussions/3273
    *maybe_child = Some(output);

    // let res = Command::new("./gource.exe")
    //     .current_dir(gource_path)
    //     .args(["D:/rm_dashboard"])
    //     .spawn();
    // println!("{:?}", res);

    // println!("status: {}", output.status);
    // println!("stdout: {}", String::from_utf8_lossy(&output.stdout));
    // println!("stderr: {}", String::from_utf8_lossy(&output.stderr));

    // .spawn();
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
