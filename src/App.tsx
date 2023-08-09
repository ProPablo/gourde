import { useCallback, useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import { Command } from "@tauri-apps/api/shell";
import { EventCallback, listen } from '@tauri-apps/api/event'
import { removeFile } from '@tauri-apps/api/fs'
import { useToast } from "./hooks/useToast";
import './chat.scss'
import "./App.css";
import Dropdown from "./components/Dropdown";
import { appWindow } from "@tauri-apps/api/window";
import { os, path, tauri } from "@tauri-apps/api";
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, MessageModel } from '@chatscope/chat-ui-kit-react';
import { open, ask, OpenDialogOptions } from '@tauri-apps/api/dialog';
import Terminal from "./components/Terminal";
import { useError } from "./hooks/useError";

// import { LexRuntimeV2 } from 'aws-sdk'
// import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
const launchRatios = [

  "800x600",
  "1280x720",
]
const test: MessageModel[] = [{ direction: "incoming", message: "Hello, how can I help you today?", position: "normal" }]




const MAX_SECONDS_PERDAY = 5;
function App() {
  const setToast = useToast();
  const setError = useError();
  const [lines, setLines] = useState<string[]>([]);
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  // const [location, setLocation] = useState("");
  // const [location, setLocation] = useState(String.raw`D:/rm_dashboard`);
  const [location, setLocation] = useState(String.raw`C:\repos\rm_dashboard`);
  const [skipStagnate, setSkipStagnate] = useState(true);
  const [launchRatio, setLauchRatio] = useState(1);
  // const [messages, setMessages] = useState<MessageModel[]>([]);
  const [messages, setMessages] = useState<MessageModel[]>(test);
  const [secondsPerDay, setSeconds] = useState<number>(50);
  const [outputVideo, setOutputVideo] = useState<boolean>(false);
  const [ffmpegOutput, setFFmpegOutput] = useState<string[]>([]);
  const [running, setRunning] = useState<boolean>(false);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  async function openDialog() {
    const options: OpenDialogOptions = {
      multiple: false,
      directory: true,
    };
    const res = await open(options) as string;

    // console.log({ res });
    if (res) {
      setLocation(res);
    }
  }

  const getppmLoc = async () => {
    // const appDir = await path.appLocalDataDir();
    const appDir = await os.tempdir();
    const binDir = await path.join(appDir, `gource.ppm`);
    return binDir;
  }
  const getOutputLoc = async () => {
    const appDir = await os.tempdir();
    const binDir = await path.join(appDir, `gource.x264.avi`);
    return binDir;
  }


  // Handling this client side, we could listen to the event in an actor thread on rust side
  async function outputVideoHandler() {
    console.log("outputVideoHandler");

    let type = await os.type();
    let outputLoc = await getOutputLoc();
    let ppmLoc = await getppmLoc();
    let args = [
      "-y",
      "-r",
      "60",
      "-f",
      "image2pipe",
      "-vcodec",
      "ppm",
      "-i",
      `${ppmLoc}`,
      "-vcodec",
      "libx264",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "1",
      "-threads",
      "0",
      "-bf",
      "0",
      `${outputLoc}`,
    ];
    console.log({ args });


    let res;
    if (type == "Windows_NT") {
      const command = Command.sidecar("bin/ffmpeg",);
      res = await command.execute();
    } else {
      const command = new Command("ffmpeg", args);
      res = await command.execute();
    }
    setOutputVideo(false);
    console.log({ res });
    await removeFile(ppmLoc);

  }

  async function killGource() {
    const res = await invoke('kill_gource')
    console.log({ res });
    setRunning(false);
  }
  
  function printToTerminal(printLines: string) {
    setLines((prev) => {
      const tempLines = [...prev, printLines];
      return tempLines;
    });
  }


  async function runGource() {

    const currentRation = launchRatios[launchRatio - 1];
    let args = [`${location}`, `-${currentRation}`];
    if (skipStagnate) {
      args = args.concat([`--auto-skip-seconds`, `0.1`]);
    }

    let minSecs = Math.max(0.1, (secondsPerDay / 100) * MAX_SECONDS_PERDAY);
    args = args.concat([`-s`, `${minSecs}`]);

    console.log({ args });

    if (outputVideo) {
      let ppmLoc = await getppmLoc();
      args = args.concat([`-o`, `${ppmLoc}`]);
    }

    printToTerminal(`gource ${args.join(' ')}`)
    try {
      const res = await invoke('run_gource', { args })
      console.log({ res, currentRation, args });
      setRunning(true);
    }
    catch (e) {
      setError(e as string)
      setRunning(false);
    }
  }

  useEffect(() => {

    const gourceFinishedHandler: EventCallback<unknown> = ({ event, payload }) => {
      console.log({ event, payload }, "Gource is finished");
      setRunning(false);
      if (outputVideo) {
        outputVideoHandler();
      }
    }

    const gourceFinishedUnlisten = listen("gource-finished", gourceFinishedHandler);
    const unMount = (async () => {
      (await gourceFinishedUnlisten)();
    });
    return () => {
      unMount();
    }

  }, [outputVideo]);





  // https://github.com/tauri-apps/tauri/discussions/5194
  // Shows how unlistening can be important because of strict mode
  useEffect(() => {

    const appWindowCloseHandler: EventCallback<unknown> = ({ event, payload }) => {
      console.log({ event, payload });
    }
    const appWindowCloseUnListen = appWindow.listen("close", appWindowCloseHandler);
    const unMount = (async () => {
      (await appWindowCloseUnListen)();

    });
    return () => {
      unMount();

    }
  }, []);

  return (
    <div className="flex bg-[#3695ab] flex-col h-screen w-screen p-3 ">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runGource();
        }}
        className="flex flex-col items-center justify-center h-1/2 flex-1"
      >
        <div className="flex flex-col">
          <div className="flex flex-row">
            <div className="flex flex-col w-1/2 min-h-[calc(100vh-25vh)] font-link mr-6 bg-slate-600 p-6 rounded-lg">
              <Dropdown
                values={launchRatios}
                name="ratio"
                title="Aspect ratio to launch at"
                onChange={(e) => {
                  console.log({ e });
                  setLauchRatio(e.target.selectedIndex)
                }}
              />
              <div className="mt-6">
                <label className="block mb-2 text-sm font-medium">Seconds per Day</label>
                <input
                  id="default-range"
                  type="range"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  value={secondsPerDay}
                  min={0}
                  max={100}
                  onChange={(e) => setSeconds(parseInt(e.target.value))}
                />
              </div>
              <div className="w-full flex justify-between text-xs px-2">
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
              </div>
              <div className="w-full flex justify-between text-xs px-2">
                <span>0</span>
                <span>{MAX_SECONDS_PERDAY}</span>
              </div>

              <div className="mt-6">
                Viewport
                {/* <div className="flex items-center my-4">
                <input id="default-radio-1" type="radio" value="" name="default-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label className="ml-2 text-sm font-medium">Fullscreen</label>
              </div>
              <div className="flex items-center">
                <input id="default-radio-2" type="radio" value="" name="default-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label className="ml-2 text-sm font-medium">Windowed</label>
              </div> */}


                {/* <button
              className="btn btn-primary mt-6"
              onClick={(e) => {
                e.preventDefault();
                outputVideoHandler();
              }}
            >
              Hey man
            </button> */}


                <div className="mt-6">
                  <label className="label cursor-pointer">
                    <span className="label-text">Skip stagnating days</span>
                    <input checked={skipStagnate}
                      onChange={() => setSkipStagnate(!skipStagnate)}
                      type="checkbox" className="checkbox" />
                  </label>
                </div>

                <div className="mt-6">
                  <label className="label cursor-pointer">
                    <span className="label-text">Output video</span>
                    <input type="checkbox" checked={outputVideo}
                     onChange={() => setOutputVideo((prev) => !prev)}
                      className="checkbox" />
                  </label>
                </div>
              </div>
              {outputVideo &&
                <div className="mt-6">
                  <label className="label cursor-pointer">
                    <span className="label-text">Placeholder 1</span>
                    <input type="checkbox" className="checkbox" />
                  </label>
                  <label className="label cursor-pointer">
                    <span className="label-text">Placeholder 2</span>
                    <input type="checkbox" className="checkbox" />
                  </label>
                  <label className="label cursor-pointer">
                    <span className="label-text">Placeholder 3</span>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </div>
              }

              {/* <div className="flex flex-col my-6">
              <p className="text-left mb-3">Date Range</p>
              <div className="flex flex-row">
                <input placeholder="Start date"
                  className="input input-bordered rounded-lg text-xs w-1/2"
                ></input>
                <input placeholder="End date"
                  className="input input-bordered rounded-lg text-xs w-1/2"
                ></input>
              </div>
            </div> */}

            </div>


            <div className="items-center flex flex-col font-link justify-center bg-slate-600 p-6 rounded-lg">
              <div className="flex flex-row items-center">

                <input placeholder="Enter repo location..."
                  className="input input-bordered max-w-xs rounded-lg m-5"
                  onChange={e => { setLocation(e.target.value) }}
                  value={location}
                ></input>

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    openDialog();
                  }}

                  className="btn font-link"
                >OPEN</button>

              </div>

              <button
                className="btn font-link m-16 p-12"
                type="submit"
              >Gource</button>
              <span className="badge">{running ? 'Gource is running' : 'Gource is not running'}</span>
              {running && 
                <button
                  className="btn font-link"
                  onClick={(e)=> {
                    e.preventDefault()
                    killGource();
                  }}
                >Kill</button>
              }
            </div>
          </div>

          <Terminal lines={lines} />
        </div>

      </form>

    </div >
  );
}

export default App;
