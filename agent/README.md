# Agent Setup Instructions

This Node.js agent runs in the background on the Windows laptops you wish to monitor. It provides a WebSocket server that allows the dashboard to request screen recordings and live audio streams.

## Prerequisites
1. **Node.js**: Install Node.js on the laptop.
2. **FFmpeg**: 
   - Download the Windows build of `ffmpeg` (e.g., from gyan.dev).
   - Extract and add the `bin/` folder to the laptop's System `PATH` environment variable.
3. **Audio Setup**:
   - To capture system audio alongside the microphone, you must enable "Stereo Mix" in the Windows Sound Control Panel (Recording tab -> Show Disabled Devices).
   - Alternatively, install a Virtual Audio Cable (like VB-Audio Cable) to route system audio out into a virtual microphone in.
   - Run the command `ffmpeg -list_devices true -f dshow -i dummy` in the command prompt to find the exact name of your audio device.
   - You may need to set the environment variable `MIC_DEVICE` when running the agent, e.g., `set MIC_DEVICE="Microphone (Realtek(R) Audio)"` (update this string to match your device).

## Installation
In this `agent` folder, run:
```bash
npm install
```

## Running the Agent
```bash
node server.js
```
The agent will start on port `8443`. To change the port, set the `PORT` environment variable. 
By default, the laptop's hostname is used as its ID. You can override it with `set LAPTOP_ID="MyLaptopName"`.

## Running as a Background Service
To run this automatically when the laptop starts without showing a console window:
1. Open Windows Task Scheduler.
2. Create a Basic Task.
3. Trigger: "When the computer starts" or "At log on".
4. Action: Start a program.
   - Program/script: `node`
   - Add arguments: `C:\path\to\your\Employee-Monitor\agent\server.js`
   - Start in: `C:\path\to\your\Employee-Monitor\agent`
5. In the task properties, select **"Run whether user is logged on or not"** and check **"Hidden"**.

*Note: The agent relies on `node-notifier` to display Windows toasts whenever a recording or listening session starts or stops.*
