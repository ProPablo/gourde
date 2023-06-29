import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import { Command } from "@tauri-apps/api/shell";
import './chat.scss'
import "./App.css";
import Dropdown from "./components/Dropdown";
import { appWindow } from "@tauri-apps/api/window";
import { path, tauri } from "@tauri-apps/api";
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, MessageModel } from '@chatscope/chat-ui-kit-react';
import { open, ask, OpenDialogOptions } from '@tauri-apps/api/dialog';

// import { LexRuntimeV2 } from 'aws-sdk'
// import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
const launchRatios = [

  "800x600",
  "1280x720",
]
const test: MessageModel[] = [{ direction: "incoming", message: "Hello, how can I help you today?", position: "normal" }]

const MAX_SECONDS_PERDAY = 5;
function App() {
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

    console.log({ res });
    if (res) {
      setLocation(res);
    }
  }

  async function runGource() {
    //     gource -1280x720 -o gource.ppm C:\\path\\to\\code\\repository
    // C:\\ffmpeg\\bin\\ffmpeg -y -r 60 -f image2pipe -vcodec ppm -i gource.ppm -vcodec libx264 -preset medium -pix_fmt yuv420p -crf 1 -threads 0 -bf 0 gource.x264.avi
    // const command = Command.sidecar("bin/gource/gource");
    // const gourceDir = await (await path.join((await path.resourceDir()), '/bin/gource')).replace(/^\\\\\?\\/, '');
    // console.log((gourceDir));


    // const command = new Command("gource", [`${location}`, `--auto-skip-seconds`, `0.1`, `--viewport`, `${launchRatios[launchRatio]}`], { cwd: gourceDir });

    // // const res = await command.execute();
    // command.stdout.on('data', line => console.log(`binarycommand stdout: "${line}"`));
    // command.stderr.on('data', line => console.log(`binary command stderr: "${line}"`));
    // // const child = await command.spawn();
    // const child = command.spawn();
    // console.log({ child, command });
    // `--viewport`, `${launchRatios[launchRatio]}`
    const currentRation = launchRatios[launchRatio - 1];
    let args = [`${location}`, `-${currentRation}`];
    if (skipStagnate) {
      args = args.concat([`--auto-skip-seconds`, `0.1`]);
    }

    let minSecs = Math.max(0.1, (secondsPerDay / 100) * MAX_SECONDS_PERDAY);
    args = args.concat([`-s`, `${minSecs}`]);

    console.log({ args });


    const res = await invoke('run_gource', { args })
    console.log({ res, currentRation, args });


    // This doesnt kill the child after

  }
  // async function generateGourceVideo() {
  useEffect(() => {
    appWindow.listen("close", ({ event, payload }) => {
      console.log({ event, payload });
    });

  })

  return (
    <>
      <div className="flex bg-[#3695ab] flex-col h-[100vh] align-middle w-full p-3 items-center justify-center ">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runGource();
          }}
          className="flex flex-row justify-center h-1/2 flex-1"
        >
          <div className="flex flex-col font-link mr-6 bg-slate-600 p-6 rounded-lg">
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

              <div className="mt-6">
                <label className="label cursor-pointer">
                  <span className="label-text">Skip Stagnating days</span>
                  <input checked={skipStagnate}
                    onChange={() => setSkipStagnate(!skipStagnate)}
                    type="checkbox" className="checkbox" />
                </label>
              </div>

              <div className="mt-6">
                <label className="label cursor-pointer">
                  <span className="label-text">Output video</span>
                  <input type="checkbox" checked={outputVideo}
                    onChange={() => setOutputVideo(!outputVideo)}
                    className="checkbox" />
                </label>
              </div>
            </div>


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
            onClick={(e)=>{
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
          </div>
        </form>

        {/* <div className="mt-6 w-full">

          <MainContainer className="rounded-lg">
            <ChatContainer>
              <MessageList>
                {messages.map(m => (
                  <Message model={m} />

                ))}
              </MessageList>
              <MessageInput placeholder="Enter text here" />
            </ChatContainer>
          </MainContainer>
        </div> */}
      </div >
    </>
  );
}

export default App;
