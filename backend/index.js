const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*", methods: ["GET", "POST"] } 
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// --- KONFIGURASI KEAMANAN & SESI ---
const SECRET_KEY = 'mc-manager-secret-key-123'; 
let currentAdminPassword = 'admin'; 
let activeToken = null; 
let sessionSettings = {
  timeoutMinutes: 30,
  autoLogoutOtherDevices: true,
  ramDefault: 2048
};

app.use(cors());
app.use(express.json());

const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

// --- MIDDLEWARE: AUTENTIKASI TOKEN ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Sesi tidak ditemukan. Silakan login kembali." });

  if (sessionSettings.autoLogoutOtherDevices && activeToken && token !== activeToken) {
    return res.status(403).json({ error: "Akun Anda telah masuk dari perangkat lain." });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Sesi kedaluwarsa." });
    req.user = user;
    next();
  });
};

const getHostIP = () => {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
};

// --- ENDPOINTS: AUTH & SETTINGS ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === currentAdminPassword) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: `${sessionSettings.timeoutMinutes}m` });
    activeToken = token; 
    res.json({ token, settings: sessionSettings });
  } else {
    res.status(401).json({ error: "Username atau Password salah!" });
  }
});

app.post('/api/settings/update', authenticateToken, (req, res) => {
  const { password, timeoutMinutes, autoLogoutOtherDevices, ramDefault } = req.body;
  if (password) currentAdminPassword = password;
  sessionSettings = {
    ...sessionSettings,
    timeoutMinutes: parseInt(timeoutMinutes) || sessionSettings.timeoutMinutes,
    autoLogoutOtherDevices: autoLogoutOtherDevices !== undefined ? autoLogoutOtherDevices : sessionSettings.autoLogoutOtherDevices,
    ramDefault: ramDefault || sessionSettings.ramDefault
  };
  res.json({ message: "Pengaturan diperbarui", settings: sessionSettings });
});

// --- ENDPOINTS: SERVER MANAGEMENT ---
app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const mcServers = containers
      .filter(c => c.Names[0].startsWith('/mc-') && !c.Names[0].includes('api') && !c.Names[0].includes('ui'))
      .map(c => {
        const portBinding = c.Ports.find(p => p.PrivatePort === 19132);
        return {
          id: c.Id,
          name: c.Names[0].replace('/mc-', '').replace('/', ''),
          status: c.State,
          address: `${getHostIP()}:${portBinding ? portBinding.PublicPort : 'N/A'}`,
          port: portBinding ? portBinding.PublicPort : 'N/A'
        };
      });
    res.json(mcServers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/servers', authenticateToken, async (req, res) => {
  // Destruktur data kustomisasi dari request body
  const { 
    name, port, ram, seed, gamemode, difficulty, cheats, levelType 
  } = req.body;
  
  const containerName = `mc-${name.toLowerCase().replace(/\s+/g, '-')}`;
  const image = 'itzg/minecraft-bedrock-server';

  res.status(202).json({ message: 'Deployment dimulai' });

  try {
    io.emit('pull-status', { message: `Menyiapkan ${name}...`, progress: 5 });
    
    docker.pull(image, (err, stream) => {
      if (err) return io.emit('pull-status', { message: 'Gagal mengunduh image', progress: 0 });
      
      docker.modem.followProgress(stream, async (finishErr) => {
        if (finishErr) return io.emit('pull-status', { message: 'Gagal proses akhir', progress: 0 });
        
        try {
          // Siapkan Environment Variables untuk Bedrock Server
          const envs = [
            'EULA=TRUE',
            `SERVER_NAME=${name}`,
            `MEMORY=${ram || sessionSettings.ramDefault}M`,
            `GAMEMODE=${gamemode || 'survival'}`,
            `DIFFICULTY=${difficulty || 'easy'}`,
            `LEVEL_TYPE=${levelType || 'DEFAULT'}`,
            `CHEATS=${cheats ? 'true' : 'false'}`
          ];

          // Tambahkan seed jika diisi
          if (seed) envs.push(`LEVEL_SEED=${seed}`);

          const container = await docker.createContainer({
            Image: image,
            name: containerName,
            Env: envs,
            ExposedPorts: { '19132/udp': {} },
            HostConfig: {
              PortBindings: { '19132/udp': [{ HostPort: port.toString() }] },
              Binds: [`${DATA_DIR}/${containerName}:/data`],
              RestartPolicy: { Name: 'unless-stopped' }
            }
          });
          
          await container.start();
          io.emit('pull-status', { message: `Server ${name} Selesai!`, progress: 100 });
        } catch (e) { 
          io.emit('pull-status', { message: 'Error: ' + e.message, progress: 0 }); 
        }
      }, (event) => {
        if (event.status === 'Downloading' || event.status === 'Extracting') {
          const current = event.progressDetail?.current || 0;
          const total = event.progressDetail?.total || 1;
          const percent = Math.floor((current / total) * 100);
          io.emit('pull-status', { message: `${event.status}...`, progress: Math.min(95, percent) });
        }
      });
    });
  } catch (err) { console.error(err); }
});

app.post('/api/servers/:id/:action', authenticateToken, async (req, res) => {
  const { id, action } = req.params;
  try {
    const container = docker.getContainer(id);
    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'delete') {
      await container.stop().catch(() => {});
      await container.remove();
    }
    res.json({ message: 'OK' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/servers/:name/import', authenticateToken, upload.single('world'), (req, res) => {
  const targetPath = path.resolve(DATA_DIR, `mc-${req.params.name}`, 'worlds');
  try {
    const zip = new AdmZip(req.file.path);
    if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
    zip.extractAllTo(targetPath, true);
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Import sukses' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

server.listen(5000, () => console.log('🚀 Orchestrator di port 5000'));