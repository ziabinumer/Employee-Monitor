# Academy Laptop Monitor

A LAN-based, transparent tool for employee monitoring and quality assurance in online teaching environments.

This tool is composed of two parts:
1. **Agent (`/agent`)**: A Node.js background service running on each Windows teaching laptop. It listens for WebSocket commands and manages `ffmpeg` processes for screen recording and live audio streaming. It transparently notifies the user via Windows toasts whenever recording or live-listening occurs.
2. **Dashboard (`/dashboard`)**: A static HTML/JS page for managers. It connects directly to the laptops on the local network (no cloud infrastructure required).

## Features
- **LAN Direct Connection**: Operates entirely over the local network via WebSockets.
- **Screen Recording**: Captures the desktop and saves it as a local `.mp4` on the teaching laptop.
- **Live Audio Listening**: Mixes microphone and system audio and streams it to the dashboard over the network.
- **Transparent Operation**: Triggers Windows toast notifications on the monitored laptop whenever monitoring actions begin or end, ensuring transparency.

## Setup Instructions

1. **Agent Setup**: 
   - See `agent/README.md` for detailed instructions on installing dependencies, setting up audio devices, configuring `ffmpeg`, and creating the Windows Task Scheduler entry.

2. **Dashboard Setup**:
   - The dashboard is completely static. Simply open `dashboard/index.html` in a modern web browser (e.g., Chrome, Edge).
   - Edit `index.html` to update the `laptops` array with the actual static IP addresses and IDs of your teaching laptops.

## Important Notes
- Ensure all teacher laptops are assigned static IP addresses on your router so the dashboard can consistently find them.
- Because there is no central relay server, the dashboard must be on the same physical/Wi-Fi network as the laptop it is trying to reach.