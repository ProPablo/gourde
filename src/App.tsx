import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import { Command } from "@tauri-apps/api/shell";
import "./App.css";
import Dropdown from "./components/Dropdown";
import { appWindow } from "@tauri-apps/api/window";
const launchRatios = [
  "800x600",
  "1366×768",
  "1536×864",
]

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  // const [location, setLocation] = useState("");
  const [location, setLocation] = useState(String.raw`C:\repos\rm_dashboard`);
  const [skipStagnate, setSkipStagnate] = useState(true);
  const [launchRatio, setLauchRatio] = useState(0);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  async function runGource() {
    //     gource -1280x720 -o gource.ppm C:\\path\\to\\code\\repository
    // C:\\ffmpeg\\bin\\ffmpeg -y -r 60 -f image2pipe -vcodec ppm -i gource.ppm -vcodec libx264 -preset medium -pix_fmt yuv420p -crf 1 -threads 0 -bf 0 gource.x264.avi
    // const command = Command.sidecar("bin/gource/gource");

    const command = new Command("gource", [`${location}`, `--auto-skip-seconds`, `0.1`, `--viewport`, `${launchRatios[launchRatio]}`]);

    // const res = await command.execute();
    command.stdout.on('data', line => console.log(`binarycommand stdout: "${line}"`));
    command.stderr.on('data', line => console.log(`binary command stderr: "${line}"`));
    const child = await command.spawn();
    console.log({child, command});
    
    // This doesnt kill the child after

    console.log({ res });

  }
  // async function generateGourceVideo() {
  useEffect(() => {
    appWindow.listen("close", ({ event, payload }) => {
      console.log({ event, payload });
    });

  })

  return (
    <div className="flex bg-cyan-600 flex-col h-[100vh] align-middle w-full p-3 items-center justify-center ">
      <h1>Welcome to Tauri hey!</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runGource();
        }}
        className="flex flex-row justify-center h-1/2 flex-1"
      >
        <div className="flex flex-col mr-20 ">
          <Dropdown
            values={launchRatios}
            name="ratio"
            title="Aspect ratio to launch at"
            onChange={(e) => {
              console.log({ e });
              setLauchRatio(e.target.selectedIndex)
            }}
          />
        </div>
        <div className="items-center flex flex-row justify-center">
          <input placeholder="Enter repo location..."
            className="input input-bordered max-w-xs rounded-lg m-5"
            onChange={e => { setLocation(e.target.value) }}
            value={location}
          ></input>

          <button
            className=" btn"
            type="submit"
          >OPEN</button>
        </div>
      </form>
      <p>{greetMsg}</p>
    </div >
  );
}

export default App;
