const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const notifier = require('node-notifier');

// Configuration
const PORT = process.env.PORT || 8443;
const LAPTOP_ID = process.env.LAPTOP_ID || os.hostname();

// State
let isRecording = false;
let listenersCount = 0;
let recordingProcess = null;
let audioProcess = null;
const audioListeners = new Set();

// Audio Device Configuration (should be updated per laptop)
const MIC_DEVICE = process.env.MIC_DEVICE || 'Microphone Array (2- Realtek(R) Audio)';

// Setup Logger
const logDir = path.join(os.homedir(), 'AcademyRecordings');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'agent.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logLine);
    console.log(logLine.trim());
}
log(MIC_DEVICE)
log(`Starting agent for laptop ${LAPTOP_ID} on port ${PORT}...`);

// Initialize WebSocket Server
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    log(`New connection from ${clientIp}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleCommand(ws, data);
        } catch (error) {
            log(`Error parsing message: ${error.message}`);
        }
    });

    ws.on('close', () => {
        log(`Connection from ${clientIp} closed`);
        stopListening(ws);
    });

    ws.on('error', (error) => {
        log(`Connection error from ${clientIp}: ${error.message}`);
    });
});

function handleCommand(ws, data) {
    switch (data.command) {
        case 'ping':
            ws.send(JSON.stringify({
                type: 'pong',
                laptopId: LAPTOP_ID
            }));
            break;
        case 'status':
            ws.send(JSON.stringify({
                type: 'status_update',
                laptopId: LAPTOP_ID,
                isRecording: isRecording,
                listenersCount: listenersCount
            }));
            break;
        case 'start_recording':
            if (isRecording) {
                ws.send(JSON.stringify({ type: 'error', message: 'Already recording' }));
                break;
            }
            startRecording(data.title || 'recording');
            break;
        case 'stop_recording':
            if (!isRecording) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not recording' }));
                break;
            }
            stopRecording();
            break;
        case 'start_listening':
            startListening(ws);
            break;
        case 'stop_listening':
            stopListening(ws);
            break;
        default:
            log(`Unknown command received: ${data.command}`);
    }
}

log(`WebSocket server listening on ws://localhost:${PORT}`);

function startRecording(title) {
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const filename = `${title}__${timestamp}.mp4`;
    const filepath = path.join(logDir, filename);

    const ffmpegArgs = [
        '-f', 'gdigrab',
        '-framerate', '30',
        '-i', 'desktop',
        '-f', 'dshow',
        '-i', `audio=${MIC_DEVICE}`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-y',
        filepath
    ];

    notifier.notify({
        title: 'Academy Monitor',
        message: 'Your screen and audio are now being recorded for quality purposes.',
        sound: true,
        wait: true
    });

    recordingProcess = spawn('ffmpeg', ffmpegArgs);
    isRecording = true;
    log(`Started recording to ${filepath}`);

    recordingProcess.on('close', (code) => {
        log(`Recording process exited with code ${code}`);
        isRecording = false;
        recordingProcess = null;
        broadcastStatus();
    });

    broadcastStatus();
}

function stopRecording() {
    if (recordingProcess) {
        notifier.notify({
            title: 'Academy Monitor',
            message: 'Recording has stopped.',
            sound: true
        });

        recordingProcess.stdin.write('q\n');
        log('Sent stop signal to recording process');
    }
}

function broadcastStatus() {
    const statusMsg = JSON.stringify({
        type: 'status_update',
        laptopId: LAPTOP_ID,
        isRecording: isRecording,
        listenersCount: listenersCount
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(statusMsg);
        }
    });
}

function startListening(ws) {
    if (!audioListeners.has(ws)) {
        audioListeners.add(ws);
        listenersCount = audioListeners.size;

        notifier.notify({
            title: 'Academy Monitor',
            message: 'Your audio is now being listened to for quality purposes.',
            sound: true
        });

        if (!audioProcess) {
            log('Starting audio streaming process');
            const ffmpegArgs = [
                '-f', 'dshow',
                '-i', `audio=${MIC_DEVICE}`,
                '-c:a', 'libopus',
                '-f', 'webm',
                'pipe:1' // Stream output to stdout
            ];

            audioProcess = spawn('ffmpeg', ffmpegArgs);

            audioProcess.stdout.on('data', (chunk) => {
                for (const listener of audioListeners) {
                    if (listener.readyState === WebSocket.OPEN) {
                        listener.send(chunk);
                    }
                }
            });

            audioProcess.stderr.on('data', () => { /* ignore stderr */ });

            audioProcess.on('close', (code) => {
                log(`Audio process exited with code ${code}`);
                audioProcess = null;
            });
        }
        broadcastStatus();
    }
}

function stopListening(ws) {
    if (audioListeners.has(ws)) {
        audioListeners.delete(ws);
        listenersCount = audioListeners.size;

        if (audioListeners.size === 0 && audioProcess) {
            notifier.notify({
                title: 'Academy Monitor',
                message: 'Live listening has stopped.',
                sound: true
            });
            audioProcess.kill('SIGINT');
            log('Stopped audio streaming process');
        }
        broadcastStatus();
    }
}

