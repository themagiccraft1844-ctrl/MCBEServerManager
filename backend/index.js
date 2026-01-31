const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*", methods: ["GET", "POST"] } 
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(cors());
app.use(express.json());

const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

// Helper untuk ambil IP Host (sederhana)
const getHostIP = () => {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
};

app.get('/api/servers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const mcServers = containers
      .filter(c => {
        const name = c.Names[0].toLowerCase();
        return name.startsWith('/mc-') && !name.includes('api') && !name.includes('ui');
      })
      .map(c => {
        // Ambil Port dari HostConfig atau NetworkSettings
        const portBinding = c.Ports.find(p => p.PrivatePort === 19132);
        const publicPort = portBinding ? portBinding.PublicPort : 'N/A';
        
        return {
          id: c.Id,
          name: c.Names[0].replace('/mc-', '').replace('/', ''),
          status: c.State,
          address: `${getHostIP()}:${publicPort}`,
          port: publicPort,
          created: c.Created
        };
      });
    res.json(mcServers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servers', async (req, res) => {
  const { name, port, seed } = req.body;
  const containerName = `mc-${name.toLowerCase().replace(/\s+/g, '-')}`;
  const image = 'itzg/minecraft-bedrock-server';

  // Kirim response dulu biar frontend bisa tutup modal & mulai loading
  res.status(202).json({ message: 'Proses deploy dimulai...' });

  try {
    io.emit('pull-status', { message: `Memulai deploy ${name}...`, progress: 5 });

    docker.pull(image, (err, stream) => {
      if (err) return io.emit('pull-status', { message: 'Gagal Pull Image', progress: 0 });

      docker.modem.followProgress(stream, async (finishErr) => {
        if (finishErr) return io.emit('pull-status', { message: 'Gagal Finishing', progress: 0 });

        io.emit('pull-status', { message: 'Menyiapkan ruang server...', progress: 90 });

        try {
          const container = await docker.createContainer({
            Image: image,
            name: containerName,
            Env: ['EULA=TRUE', `SERVER_NAME=${name}`, `LEVEL_SEED=${seed || ''}`],
            ExposedPorts: { '19132/udp': {} },
            HostConfig: {
              PortBindings: { '19132/udp': [{ HostPort: port.toString() }] },
              Binds: [`${DATA_DIR}/${containerName}:/data`],
              RestartPolicy: { Name: 'unless-stopped' }
            }
          });

          await container.start();
          io.emit('pull-status', { message: `Server ${name} Berhasil Online!`, progress: 100 });
        } catch (e) {
          io.emit('pull-status', { message: 'Error Create: ' + e.message, progress: 0 });
        }
      }, (event) => {
        // Logika Persentase yang lebih stabil
        if (event.status === 'Downloading' || event.status === 'Extracting') {
          const current = event.progressDetail?.current || 0;
          const total = event.progressDetail?.total || 1;
          const percent = Math.floor((current / total) * 100);
          io.emit('pull-status', { 
            message: `${event.status}: ${event.id || ''}`, 
            progress: Math.min(90, Math.max(10, percent)) 
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
});

app.post('/api/servers/:id/:action', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servers/:name/import', upload.single('world'), (req, res) => {
  const { name } = req.params;
  const targetPath = path.resolve(DATA_DIR, `mc-${name}`, 'worlds');
  try {
    const zip = new AdmZip(req.file.path);
    if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
    zip.extractAllTo(targetPath, true);
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Import sukses' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(5000, () => console.log('🚀 Server ready on port 5000'));