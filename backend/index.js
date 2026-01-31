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
const os = require('os');
const { exec } = require('child_process');

// --- INISIALISASI ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] } 
});

// Koneksi ke Docker Socket
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Path Data Persisten
const DATA_DIR = path.resolve(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

// Pastikan folder ada
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

// --- SISTEM PERSISTENCE (LOWDB STYLE SEDERHANA) ---
let db = {
  admin: { username: 'admin', password: 'adminpassword123' }, // Default
  settings: { timeoutMinutes: 60, ramDefault: 2048, autoLogout: true },
  secrets: { jwtKey: 'rahasia-super-aman-' + Date.now() } // Rotate key saat restart container baru
};

// Load config dari disk jika ada
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    db = { ...db, ...loaded };
  } catch (e) { console.error("Gagal load config, menggunakan default"); }
}

// Persist default config (including jwtKey) on first run so tokens survive restarts
if (!fs.existsSync(CONFIG_FILE)) {
  try {
    saveConfig();
    console.log('Config file created to persist secrets.');
  } catch (e) { console.error('Gagal menyimpan config awal:', e.message); }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(db, null, 2));
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Request logging for debugging (prints auth header / query token and body)
app.use((req, res, next) => {
  try {
    const auth = req.headers['authorization'] || req.query?.token || 'no-token';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} Auth:${auth} Body:${JSON.stringify(req.body || {})}`);
  } catch (e) { /* ignore logging errors */ }
  next();
});

const authenticateToken = (req, res, next) => {
  // Accept token from Authorization header or ?token=... query parameter as fallback
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, db.secrets.jwtKey, (err, user) => {
    if (err) return res.status(403).json({ error: "Token expired or invalid" });
    req.user = user;
    next();
  });
};

// --- HELPER: GET REAL IP ---
const getHostIP = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Lewati internal docker/localhost, cari IP LAN (biasanya 192.168.x.x atau 10.x.x.x)
      if (net.family === 'IPv4' && !net.internal && !name.includes('docker') && !name.includes('br-')) {
        return net.address;
      }
    }
  }
  return 'localhost'; // Fallback
};

// --- SOCKET.IO: LIVE CONSOLE STREAMING ---
io.on('connection', (socket) => {
  let stream = null;

  socket.on('attach-console', async (containerId) => {
    try {
      const container = docker.getContainer(containerId);
      // Attach ke stdout dan stderr container
      stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
        logs: true
      });
      
      stream.on('data', (chunk) => {
        // Bersihkan karakter aneh buffer
        socket.emit('console-out', chunk.toString('utf8'));
      });
    } catch (e) {
      socket.emit('console-out', `Error attaching: ${e.message}`);
    }
  });

  socket.on('send-command', async ({ containerId, command }) => {
    try {
      const container = docker.getContainer(containerId);
      // Kirim command ke stdin container (mc server console)
      // Perlu attach stdin
      const exec = await container.exec({
        AttachStdin: true,
        AttachStdout: false,
        AttachStderr: false,
        Cmd: ['rcon-cli', command] // Menggunakan RCON CLI bawaan image itzg
        // Alternatif jika tanpa RCON: Cmd: ['sh', '-c', `echo "${command}" > /proc/$(pgrep bedrock)/fd/0`] (sangat hacky)
      });
      
      await exec.start({ Detach: false, Tty: false });
      // Log manual karena rcon output mungkin tidak langsung masuk stream attach di atas
      socket.emit('console-out', `> ${command}\n`);
    } catch (e) {
      socket.emit('console-out', `Command failed: ${e.message}\n`);
    }
  });

  socket.on('disconnect', () => {
    if (stream) stream.destroy();
  });
});

// --- API AUTH ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === db.admin.username && password === db.admin.password) {
    const token = jwt.sign({ username }, db.secrets.jwtKey, { expiresIn: `${db.settings.timeoutMinutes}m` });
    res.json({ token, settings: db.settings });
  } else {
    res.status(401).json({ error: "Kredensial salah" });
  }
});

app.post('/api/settings', authenticateToken, (req, res) => {
  const { password, timeoutMinutes, ramDefault } = req.body;
  if (password) db.admin.password = password;
  if (timeoutMinutes) db.settings.timeoutMinutes = parseInt(timeoutMinutes);
  if (ramDefault) db.settings.ramDefault = parseInt(ramDefault);
  saveConfig();
  res.json({ message: "Settings disimpan" });
});

// --- API SERVERS ---
app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const mcServers = await Promise.all(containers
      .filter(c => c.Names[0].startsWith('/mc-'))
      .map(async c => {
        const portBinding = c.Ports.find(p => p.PrivatePort === 19132);
        
        // Ambil statistik real (CPU/RAM) - ini operasi berat, gunakan cache di prod
        let stats = { cpu: 0, ram: 0, ramLimit: 0 };
        if (c.State === 'running') {
          // Note: Mengambil stats via API dockerode agak lambat untuk list banyak, 
          // untuk demo ini kita skip stats detail per list agar cepat, 
          // stats detail diambil saat "Manage".
        }

        return {
          id: c.Id,
          name: c.Names[0].replace('/mc-', '').replace('/', ''),
          status: c.State, // running, exited
          address: getHostIP(),
          port: portBinding ? portBinding.PublicPort : 'N/A',
          image: c.Image
        };
      }));
    res.json(mcServers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE SERVER LENGKAP
app.post('/api/servers', authenticateToken, async (req, res) => {
  const { 
    name, port, ram, seed, gamemode, difficulty, 
    cheats, levelType, version, onlineMode 
  } = req.body;

  console.log('Create server request body:', { name, port, ram, gamemode, difficulty, cheats, version });

  // Basic validation
  if (!name) return res.status(400).json({ error: 'Nama server wajib diisi' });
  if (!port || isNaN(parseInt(port))) return res.status(400).json({ error: 'Port tidak valid' });
  if (!ram || isNaN(parseInt(ram))) return res.status(400).json({ error: 'RAM tidak valid' });

  const containerName = `mc-${name.toLowerCase().replace(/\s+/g, '-')}`;
  const image = 'itzg/minecraft-bedrock-server:latest'; // Selalu gunakan latest atau versi spesifik

  // Environment Variables lengkap untuk itzg image
  const envs = [
    'EULA=TRUE',
    `SERVER_NAME=${name}`,
    `server-port=19132`, // Internal port selalu 19132
    `GAMEMODE=${gamemode || 'survival'}`,
    `DIFFICULTY=${difficulty || 'easy'}`,
    `LEVEL_TYPE=${levelType || 'DEFAULT'}`,
    `ALLOW_CHEATS=${cheats ? 'true' : 'false'}`,
    `ONLINE-MODE=${onlineMode ? 'true' : 'false'}`, // Xbox Auth
    `view-distance=32`,
    `tick-distance=4`,
    `MEMORY=${ram || db.settings.ramDefault}M` // Hanya indikatif untuk monitoring
  ];
  
  if (seed) envs.push(`LEVEL_SEED=${seed}`);
  if (version && version !== 'latest') envs.push(`VERSION=${version}`);

  try {
    // Cek port conflict di host
    const containers = await docker.listContainers({ all: true });
    const portUsed = containers.some(c => 
      c.Ports.some(p => p.PublicPort === parseInt(port))
    );
    if (portUsed) return res.status(400).json({ error: `Port ${port} sudah digunakan!` });

    // Pull Image (Background process)
    res.status(202).json({ message: 'Inisialisasi deployment...' });
    
    // Proses pembuatan container
    const createAndStart = async () => {
      try {
        io.emit('status-update', { msg: `Creating container ${name}...`, type: 'info' });
        
        const container = await docker.createContainer({
          Image: image,
          name: containerName,
          Env: envs,
          ExposedPorts: { '19132/udp': {} },
          HostConfig: {
            PortBindings: { '19132/udp': [{ HostPort: port.toString() }] },
            Binds: [`${DATA_DIR}/${containerName}:/data`], // Persistent Volume Mapping
            RestartPolicy: { Name: 'unless-stopped' },
            Memory: parseInt(ram) * 1024 * 1024 // Hard Limit RAM Docker
          },
          Tty: true, // Penting untuk Console RCON
          OpenStdin: true
        });

        await container.start();
        io.emit('status-update', { msg: `Server ${name} ONLINE!`, type: 'success' });
      } catch (e) {
        io.emit('status-update', { msg: `Gagal deploy: ${e.message}`, type: 'error' });
      }
    };

    // Cek image local dulu
    const images = await docker.listImages();
    const hasImage = images.some(i => i.RepoTags && i.RepoTags.includes(image));

    if (!hasImage) {
      io.emit('status-update', { msg: 'Mengunduh Image Bedrock Server (ini memakan waktu)...', type: 'info' });
      docker.pull(image, (err, stream) => {
        if (err) return;
        docker.modem.followProgress(stream, createAndStart);
      });
    } else {
      createAndStart();
    }

  } catch (err) { res.status(500).json({ error: err.message }); }
});

// START / STOP / RESTART / DELETE
app.post('/api/servers/:id/:action', authenticateToken, async (req, res) => {
  const { id, action } = req.params;
  try {
    const container = docker.getContainer(id);
    const info = await container.inspect();
    const serverName = info.Name.replace('/mc-', ''); // Untuk delete folder

    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'restart') await container.restart();
    else if (action === 'delete') {
      try { await container.stop(); } catch(e) {} // Abaikan jika sudah stop
      await container.remove();
      // Opsi: Hapus data world juga? Untuk keamanan, kita rename saja jadi _deleted
      const oldPath = path.join(DATA_DIR, info.Name.replace('/', ''));
      if (fs.existsSync(oldPath)) {
         fs.renameSync(oldPath, `${oldPath}_deleted_${Date.now()}`);
      }
    }
    res.json({ message: `Action ${action} sukses` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FILE MANAGEMENT & PROPERTIES EDITING ---

// Ambil server.properties
app.get('/api/servers/:name/properties', authenticateToken, (req, res) => {
  const propsPath = path.join(DATA_DIR, `mc-${req.params.name}`, 'server.properties');
  if (!fs.existsSync(propsPath)) return res.json({}); // Belum ter-generate

  const content = fs.readFileSync(propsPath, 'utf8');
  const props = {};
  content.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, val] = line.split('=');
      if (key) props[key.trim()] = val ? val.trim() : '';
    }
  });
  res.json(props);
});

// Simpan server.properties (PENTING: Server harus restart)
app.post('/api/servers/:name/properties', authenticateToken, (req, res) => {
  const propsPath = path.join(DATA_DIR, `mc-${req.params.name}`, 'server.properties');
  let content = "";
  
  // Baca file asli untuk mempertahankan komentar (opsional, disini kita overwrite sederhana)
  // Reconstruct file content
  Object.keys(req.body).forEach(key => {
    content += `${key}=${req.body[key]}\n`;
  });

  fs.writeFileSync(propsPath, content);
  res.json({ message: "Konfigurasi disimpan. Restart server untuk menerapkan." });
});

// BACKUP WORLD (ZIP)
app.get('/api/servers/:name/backup', authenticateToken, async (req, res) => {
  const serverDir = path.join(DATA_DIR, `mc-${req.params.name}`);
  const worldsDir = path.join(serverDir, 'worlds');

  if (!fs.existsSync(worldsDir)) return res.status(404).json({ error: "World tidak ditemukan" });

  try {
    const zip = new AdmZip();
    zip.addLocalFolder(worldsDir);
    const backupName = `${req.params.name}_backup_${Date.now()}.zip`;
    const buffer = zip.toBuffer();
    
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=${backupName}`);
    res.set('Content-Length', buffer.length);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: "Gagal membackup: " + e.message });
  }
});

// UPLOAD / IMPORT WORLD
app.post('/api/servers/:name/import', authenticateToken, upload.single('world'), async (req, res) => {
  const serverDir = path.join(DATA_DIR, `mc-${req.params.name}`);
  const worldsDir = path.join(serverDir, 'worlds');
  
  try {
    // Hapus world lama (opsional, atau rename)
    if (fs.existsSync(worldsDir)) {
      fs.rmSync(worldsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(worldsDir);

    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(worldsDir, true); // Extract
    fs.unlinkSync(req.file.path); // Hapus file temp upload

    res.json({ message: 'World berhasil diimport. Restart server.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Orchestrator running on port ${PORT}`));