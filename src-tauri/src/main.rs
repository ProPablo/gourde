// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    process::{Child, Command},
    sync::Mutex,
};

use tauri::{AppHandle, Config, Manager, Runtime};

struct Gource_Container {
    child: Mutex<Option<Child>>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn run_gource<R: Runtime>(app: AppHandle<R>, args: Vec<String>) -> Result<(), String> {
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
        .arg("D:/rm_dashboard")
        .spawn()
        .expect("failed to execute process");

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
        .invoke_handler(tauri::generate_handler![run_gource])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
