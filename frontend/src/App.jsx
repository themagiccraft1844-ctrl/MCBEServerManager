import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { Zap, LogOut, Plus } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

// Import Modular Views (Abaikan error "Could not resolve" di Preview)
import DashboardView from './views/Dashboard';
import LoginView from './views/Login';
import ServerManageView from './views/ServerManage'; 
import SettingsView from './views/Settings';
import { CustomToast, FormField } from './components/UIAssets';

// Dynamic API Base (Otomatis deteksi IP LAN/Localhost)
const API_BASE = `http://${window.location.hostname}:5000`;
const socket = io(API_BASE);

// Exclude manager containers from management UI
const EXCLUDE_CONTAINERS = ['manager-ui', 'manager-api', 'mc-manager-ui', 'mc-manager-api'];
const isManagedServer = (srv) => {
  if (!srv) return false;
  const name = (srv.name || '').toLowerCase();
  const id = (srv.id || '').toLowerCase();
  return !EXCLUDE_CONTAINERS.some(ex => name.includes(ex) || id.includes(ex));
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('login');
  const [activeServer, setActiveServer] = useState(null);
  const [servers, setServers] = useState([]);
  
  // State Global
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [globalStatus, setGlobalStatus] = useState(null);

  // Form State untuk Create Server
  const [formData, setFormData] = useState({ 
    name: '', port: '19132', ram: 2048, seed: '', 
    gamemode: 'survival', difficulty: 'easy', cheats: false 
  });

  const showToast = (message, variant = 'success') => setToast({ show: true, message, variant });

  // Init Auth & Socket
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setView('dashboard');
      fetchServers();
    }
    
    // Global socket listener untuk notifikasi progress
    socket.on('status-update', (data) => {
      // ignore updates about manager UI/API
      const target = ((data?.name || data?.id) + '').toLowerCase();
      if (EXCLUDE_CONTAINERS.some(ex => target.includes(ex))) return;
      setGlobalStatus(data);
      if (data?.type === 'success') fetchServers();
      setTimeout(() => setGlobalStatus(null), 5000);
    });

    return () => socket.off('status-update');
  }, [token]);

  const fetchServers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/servers`);
      const list = Array.isArray(res.data) ? res.data.filter(isManagedServer) : [];
      setServers(list);
    } catch (e) {}
  };

  const handleAction = async (id, action) => {
    const target = servers.find(s => s.id === id) || {};
    if (!isManagedServer(target)) {
      showToast("Aksi dibatasi pada container manager", "danger");
      return;
    }

    if (action === 'delete' && !window.confirm("Yakin hapus? Data akan dipindahkan ke folder _deleted.")) return;
    setActionLoading(p => ({ ...p, [id]: true }));
    try {
      await axios.post(`${API_BASE}/api/servers/${encodeURIComponent(id)}/${encodeURIComponent(action)}`);
      showToast(`Perintah ${action} dikirim`, "success");
      if (action === 'delete') { setActiveServer(null); setView('dashboard'); }
      fetchServers();
    } catch (e) { showToast("Gagal eksekusi perintah", "danger"); }
    finally { setActionLoading(p => ({ ...p, [id]: false })); }
  };

  // Better error handling for auth failures on init
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) return;
      try {
        await axios.get(`${API_BASE}/api/servers`);
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setToken(null);
          localStorage.removeItem('token');
          setView('login');
          showToast('Sesi berakhir atau token tidak valid. Silakan login lagi.', 'danger');
        }
      }
    };
    checkAuth();
  }, [token]);

  const handleCreate = async (data) => {
    // Basic client-side validation
    if (!data?.name) return showToast('Nama server wajib diisi', 'danger');
    if (!data?.port || isNaN(parseInt(data.port))) return showToast('Port tidak valid', 'danger');
    // Check for duplicate host port among current servers
    const portStr = String(parseInt(data.port));
    if ((servers || []).some(s => String(s.port) === portStr)) {
      return showToast(`Port ${portStr} sudah digunakan oleh server lain`, 'danger');
    }

    try {
      const res = await axios.post(`${API_BASE}/api/servers`, data);
      // If backend accepted (202) or returned message, show it
      const msg = res.data?.message || 'Proses deployment dimulai...';
      showToast(msg, 'info');
      fetchServers();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.response?.data?.message || e.message || 'Gagal request deployment';
      showToast(errMsg, 'danger');
      console.error('Create server error:', e.response || e.message || e);
    }
  };

  const handleUpdateSettings = async (payload) => {
    try {
      await axios.post(`${API_BASE}/api/settings`, payload);
      showToast("Pengaturan disimpan.", "success");
      fetchServers();
    } catch (e) {
      showToast("Gagal menyimpan pengaturan", "danger");
    }
  };

  // Tampilan Login
  if (!token) return <LoginView onLoginSuccess={(t) => {setToken(t); localStorage.setItem('token', t)}} apiBase={API_BASE} showToast={showToast} />;

  return (
    <div className="bg-light min-vh-100 font-sans text-dark">
      <CustomToast {...toast} onClose={() => setToast({ ...toast, show: false })} />
      
      <Navbar bg="dark" variant="dark" className="shadow mb-4 px-3 sticky-top border-bottom border-warning">
        <Container>
          <Navbar.Brand className="fw-bold cursor-pointer" onClick={() => {setView('dashboard'); setActiveServer(null)}}>
            <Zap className="me-2 text-warning" /> BEDROCK MANAGER
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="outline-danger" size="sm" onClick={() => {setToken(null); localStorage.removeItem('token');}}>
              <LogOut size={14} className="me-1" /> KELUAR
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <Container className="pb-5">
        {activeServer ? (
          <ServerManageView 
            server={activeServer} 
            onBack={() => {setActiveServer(null); fetchServers();}}
            onAction={handleAction}
            actionLoading={actionLoading}
            socket={socket}
            apiBase={API_BASE}
            showToast={showToast}
          />
        ) : view === 'settings' ? (
          <SettingsView sessionConfig={{ timeoutMinutes: 60, ramDefault: 2048 }} onUpdateSettings={handleUpdateSettings} />
        ) : (
          <DashboardView 
            servers={servers}
            onAction={handleAction}
            onManage={(srv) => { if (isManagedServer(srv)) setActiveServer(srv); else showToast("Aksi pada container manager dibatasi.", "danger"); }}
            onOpenCreate={() => setShowModal(true)}
            actionLoading={actionLoading}
            showToast={showToast}
            globalStatus={globalStatus}
          />
        )}
      </Container>

      {/* Modal Create Server */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Body className="p-4">
          <h4 className="fw-bold mb-3">Deploy Server Baru</h4>
          <Form onSubmit={async e => {
            e.preventDefault();
            // Use centralized handler with client-side checks
            await handleCreate(formData);
            setShowModal(false);
          }}>
            <Row>
              <Col md={6}>
                <FormField label="NAMA SERVER" required onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Survival Mabar" />
              </Col>
              <Col md={3}>
                <FormField label="PORT UDP" type="number" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} />
              </Col>
              <Col md={3}>
                <FormField label="RAM (MB)" type="number" value={formData.ram} onChange={e => setFormData({...formData, ram: e.target.value})} />
              </Col>
            </Row>
            <div className="bg-light p-3 rounded mb-3">
               <Form.Check type="switch" label="Allow Cheats (Operator)" checked={formData.cheats} onChange={e => setFormData({...formData, cheats: e.target.checked})} className="fw-bold"/>
            </div>
            <Button type="submit" className="w-100 mt-2 fw-bold rounded-pill" variant="primary">LUNCURKAN SERVER</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}