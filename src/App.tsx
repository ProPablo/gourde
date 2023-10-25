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
import { useAtom } from "jotai";
import { lastFileLocAtom } from "./store";

// import { LexRuntimeV2 } from 'aws-sdk'
// import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
const launchRatios = [

  "800x600",
  "1280x720",
]

enum FfmpegPreset {
  ULTRAFAST = "ultrafast",
  MEDIUM = "medium"
}

const init_strings = [
  "This is the console!"
]

enum State {
  IDLE,
  RUNNING,
  GETTING_VIDEO
}

function state2str(state: State) {
  switch (state) {
    case State.IDLE:
      return "IDLE"
    case State.RUNNING:
      return "RUNNING"
    case State.GETTING_VIDEO:
      return "GETTING_VIDEO"
  }
}

const MAX_SECONDS_PERDAY = 5;
function App() {
  const setToast = useToast();
  const setError = useError();
  const [lines, setLines] = useState<string[]>(init_strings);
  const [name, setName] = useState("");
  // const [location, setLocation] = useState(String.raw`D:/rm_dashboard`);
  const [location, setLocation] = useAtom(lastFileLocAtom);
  const [skipStagnate, setSkipStagnate] = useState(true);
  const [launchRatio, setLauchRatio] = useState(1);
  // const [messages, setMessages] = useState<MessageModel[]>([]);
  const [secondsPerDay, setSeconds] = useState<number>(50);
  const [outputVideo, setOutputVideo] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [runningFFmpeg, setRunningFFmpeg] = useState<boolean>(false);


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
    setRunningFFmpeg(true);

    let type = await os.type();
    let outputLoc = await getOutputLoc();
    let ppmLoc = await getppmLoc();
    const appDir = await os.tempdir();
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


    let command;
    if (type == "Windows_NT") {
      command = Command.sidecar("bin/ffmpeg", args);
      console.log({ command });
    } else {
      command = new Command("ffmpeg", args);

      // command.stdout.on('data', line => console.log(`binarycommand stdout: "${line}"`));
      // command.stderr.on('data', line => console.log(`binary command stderr: "${line}"`));
    }

    command.stdout.on('data', line => console.log(`binarycommand stdout: "${line}"`));
    command.stderr.on('data', line => {
      printToTerminal(line);
      console.log(`binary command stderr: "${line}"`)

    });

    //Wait for the command to finish 
    let res = await command.execute();
    setOutputVideo(false);
    setRunningFFmpeg(false);
    console.log({ res });
    printToTerminal(`ffmpeg ${args.join(' ')}`);
    // TODO: handle stderr from res and try catch

    console.log("help");

    try {
      await removeFile(ppmLoc);
    }
    catch {
      setError("Cannot delete gource.ppm from temp (known mac bug)");
    }

    await invoke('show_in_folder', { path: outputLoc });
  }

  async function killGource() {
    const res = await invoke('kill_child')
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
    <div className="flex bg-[#3695ab] flex-col p-3 ">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runGource();
        }}
        className="flex flex-col items-center justify-center h-1/2 flex-1"
      >

        <div className="flex flex-row w-full">
          <div className="flex flex-col w-1/2 lg:w-2/3 min-h-[calc(100vh-25vh)] font-link mr-6 bg-slate-600 p-6 rounded-lg">
            <Dropdown
              values={launchRatios}
              name="ratio"
              title="Aspect Ratio"
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
            <div className="flex justify-between text-xs px-2">
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>
            <div className="flex justify-between text-xs px-2">
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
                  <span className="label-text">Skip Stagnating Days</span>
                  <input checked={skipStagnate}
                    onChange={() => setSkipStagnate(!skipStagnate)}
                    type="checkbox" className="checkbox" />
                </label>
              </div>

              <div className="mt-6">
                <label className="label cursor-pointer">
                  <span className="label-text">Output Video</span>
                  <input type="checkbox" checked={outputVideo}
                    onChange={() => setOutputVideo((prev) => !prev)}
                    className="checkbox" />
                </label>
              </div>
            </div>
            {outputVideo &&
              <div className="ml-6 mt-6">
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


          <div className="w-1/2 lg:w-1/3 items-center flex flex-col font-link justify-center bg-slate-600 p-6 rounded-lg">
            <div className="flex flex-row items-center">

              <input placeholder="Enter repo location..."
                className="input input-bordered max-w-xs rounded-lg m-5"
                onChange={e => { setLocation(e.target.value) }}
                value={location ?? undefined}
              ></input>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  openDialog();
                }}

                className="btn font-link"
              >OPEN</button>

            </div>

            <div className="flex flex-col gap-3 items-center">
              <button
                className="btn btn-lg font-link m-16 hover:scale-110 transition-scale"
                type="submit"
              >
                  Gource
              </button>
              <span className={`${running && "badge-success"} badge p-3`}>{running ? 'Gource is running' : 'Gource is not running'}</span>
              <span className={`${runningFFmpeg && "badge-success"} badge p-3`}>{runningFFmpeg ? 'ffmpeg is running' : 'ffmpeg is not running'}</span>
              {running &&
                <button
                  className="btn hover:btn-error font-link"
                  onClick={(e) => {
                    e.preventDefault()
                    killGource();
                  }}
                >Kill</button>
              }
            </div>

          </div>
        </div>


      </form>
      <div className="flex-grow-0 w-full my-5 bg-gray-800 rounded-lg">
        <Terminal lines={lines} />
      </div>

    </div >
  );
}

export default App;
