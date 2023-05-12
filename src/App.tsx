import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import { Command } from "@tauri-apps/api/shell";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }
  async function generateGourceVideo() {
    //     gource -1280x720 -o gource.ppm C:\\path\\to\\code\\repository
    // C:\\ffmpeg\\bin\\ffmpeg -y -r 60 -f image2pipe -vcodec ppm -i gource.ppm -vcodec libx264 -preset medium -pix_fmt yuv420p -crf 1 -threads 0 -bf 0 gource.x264.avi
    // const command = Command.sidecar("bin/gource/gource");
    const command = new Command("gource");
    const res = await command.execute();
    // command.stdout.on('data', line => console.log(`binarycommand stdout: "${line}"`));
    // command.stderr.on('data', line => console.log(`binary command stderr: "${line}"`));
    // const child = command.spawn();
    // This doesnt kill the child after

    console.log({ res });

  }

  return (
    <div className="container bg-red-950">
      <h1>Welcome to Tauri hey!</h1>

      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <button onClick={generateGourceVideo}>Greet</button>
      <p>{greetMsg}</p>
    </div>
  );
}

export default App;
