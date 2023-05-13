import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import { Command } from "@tauri-apps/api/shell";
import "./App.css";
import Dropdown from "./components/Dropdown";
import { appWindow } from "@tauri-apps/api/window";
import { path, tauri } from "@tauri-apps/api";
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, MessageModel } from '@chatscope/chat-ui-kit-react';

import styles from '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
const launchRatios = [
  "800x600",
  "1280x720",
]
const test: MessageModel[] = [{ direction: "incoming", message: "How can i help you today", position: "normal" }]

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  // const [location, setLocation] = useState("");
  const [location, setLocation] = useState(String.raw`D:/rm_dashboard`);
  const [skipStagnate, setSkipStagnate] = useState(true);
  const [launchRatio, setLauchRatio] = useState(0);
  // const [messages, setMessages] = useState<MessageModel[]>([]);
  const [messages, setMessages] = useState<MessageModel[]>(test);
  const [secondsPerDay, setSeconds] = useState<number>(0.5);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
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
    const currentRation = launchRatios[launchRatio];
    const args = [`${location}`, , `-${currentRation}`];
    if (skipStagnate) {
      args.concat([`--auto-skip-seconds`, `0.1`]);
    }

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
          <div className="flex flex-col mr-12 font-link bg-slate-600 p-6 rounded-lg">
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
              <input id="default-range" type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
            <div className="mt-6">
              Viewport
              <div className="flex items-center my-4">
                <input id="default-radio-1" type="radio" value="" name="default-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label className="ml-2 text-sm font-medium">Fullscreen</label>
              </div>
              <div className="flex items-center">
                <input id="default-radio-2" type="radio" value="" name="default-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label className="ml-2 text-sm font-medium">Windowed</label>
              </div>
            </div>
            <div className="flex flex-col my-6">
              <p className="text-left">Date Range</p>
              <div className="flex flex-row">
                <input placeholder="Start date"
                  className="input input-bordered rounded-lg text-xs w-1/2"
                ></input>
                <input placeholder="End date"
                  className="input input-bordered rounded-lg text-xs w-1/2"
                ></input>
              </div>
            </div>
          </div>


          <div className="items-center flex flex-row font-link justify-center bg-slate-600 p-6 rounded-lg">
            <input placeholder="Enter repo location..."
              className="input input-bordered max-w-xs rounded-lg m-5"
              onChange={e => { setLocation(e.target.value) }}
              value={location}
            ></input>

            <button
              className="btn font-link"
              type="submit"
            >OPEN</button>
          </div>
        </form>
        <MainContainer>
        <ChatContainer>
          <MessageList>
            {messages.map(m => (
              <Message model={m} />

            ))}
          </MessageList>
          <MessageInput placeholder="Type message here" />
        </ChatContainer>
      </MainContainer>
      </div >
    </>
  );
}

export default App;
