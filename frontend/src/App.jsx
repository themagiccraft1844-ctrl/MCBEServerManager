import React, { useState, useEffect, useCallback } from 'react';
import { Container, Navbar, Nav, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { Server, LogOut, Plus, Cpu, Zap, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';

// Import Modular Views (Abaikan error resolve di Canvas)
import DashboardView from './views/Dashboard';
import LoginView from './views/Login';
import ServerManageView from './views/ServerManage'; 
import SettingsView from './views/Settings';
import { CustomToast, FormField } from './components/UIAssets';

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('dashboard');
  const [activeServer, setActiveServer] = useState(null);
  const [servers, setServers] = useState([]);
  
  const [sessionConfig, setSessionConfig] = useState(
    JSON.parse(localStorage.getItem('sessionConfig')) || { 
      timeoutMinutes: 30, 
      ramDefault: 2048, 
      autoLogoutOtherDevices: true 
    }
  );

  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pullInfo, setPullInfo] = useState({ message: '', progress: 0 });
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const initialForm = { 
    name: '', port: '19132', ram: 2048, seed: '', 
    gamemode: 'survival', difficulty: 'easy', cheats: true, levelType: 'DEFAULT'
  };
  const [formData, setFormData] = useState(initialForm);

  const showToast = useCallback((message, variant = 'success') => setToast({ show: true, message, variant }), []);

  // --- LOGIKA AUTENTIKASI ---
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    }
  }, [token]);

  const fetchServers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/servers`);
      setServers(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    if (!token) return;
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAction = async (id, action) => {
    setActionLoading(p => ({ ...p, [id]: true }));
    try {
      await axios.post(`${API_BASE}/api/servers/${id}/${action}`);
      showToast(`Aksi ${action} berhasil dikirim`, "success");
      fetchServers();
    } catch (e) { showToast("Gagal melakukan aksi", "danger"); }
    finally { setActionLoading(p => ({ ...p, [id]: false })); }
  };

  const handleUpdateSettings = async (payload) => {
    try {
      await axios.post(`${API_BASE}/api/settings/update`, payload);
      setSessionConfig(payload);
      localStorage.setItem('sessionConfig', JSON.stringify(payload));
      showToast("Konfigurasi sistem disimpan secara lokal dan server", "success");
    } catch (e) {
      showToast("Gagal menyimpan konfigurasi", "danger");
    }
  };

  if (!token) return <LoginView onLoginSuccess={(d) => setToken(d.token)} apiBase={API_BASE} showToast={showToast} />;

  return (
    <div className="bg-light min-vh-100 font-sans text-dark">
      <CustomToast {...toast} onClose={() => setToast({ ...toast, show: false })} />
      
      <Navbar bg="dark" variant="dark" className="shadow mb-4 px-3 sticky-top border-bottom border-warning">
        <Container>
          <Navbar.Brand className="fw-bold d-flex align-items-center cursor-pointer" onClick={() => {setView('dashboard'); setActiveServer(null)}}>
            <Zap className="me-2 text-warning" /> MINE-PANEL PRO
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link onClick={() => {setView('dashboard'); setActiveServer(null)}} active={view === 'dashboard' && !activeServer}>Dashboard</Nav.Link>
            <Nav.Link onClick={() => {setView('settings'); setActiveServer(null)}} active={view === 'settings'}>Sistem</Nav.Link>
          </Nav>
          <Button variant="outline-danger" size="sm" className="rounded-pill px-3 fw-bold border-2" onClick={() => {setToken(null); localStorage.removeItem('token');}}>
            <LogOut size={14} className="me-1" /> KELUAR
          </Button>
        </Container>
      </Navbar>

      <Container className="pb-5">
        {activeServer ? (
          <ServerManageView 
            server={activeServer} 
            onBack={() => setActiveServer(null)}
            onAction={handleAction}
            actionLoading={actionLoading}
          />
        ) : view === 'settings' ? (
          <SettingsView 
            sessionConfig={sessionConfig} 
            onUpdateSettings={handleUpdateSettings} 
          />
        ) : (
          <DashboardView 
            servers={servers}
            onAction={handleAction}
            onManage={setActiveServer}
            onOpenCreate={() => { setFormData({...initialForm, ram: sessionConfig.ramDefault}); setShowModal(true); }}
            isCreating={isCreating}
            pullInfo={pullInfo}
            actionLoading={actionLoading}
            showToast={showToast}
          />
        )}
      </Container>

      {/* MODAL: DEPLOY SERVER */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Body className="p-4 rounded-4">
          <div className="d-flex align-items-center gap-2 mb-4 text-primary">
            <Plus size={28} />
            <h4 className="fw-bold m-0">Deploy Server Baru</h4>
          </div>
          <Form onSubmit={async e => {
            e.preventDefault();
            setShowModal(false);
            setIsCreating(true);
            try { await axios.post(`${API_BASE}/api/servers`, formData); } catch(e) { setIsCreating(false); }
          }}>
            <Row>
              <Col md={6}>
                <FormField label="NAMA SERVER" placeholder="Contoh: Survival-1" required onChange={e => setFormData({...formData, name: e.target.value})} />
                <Row>
                  <Col><FormField label="PORT" type="number" value={formData.port} required onChange={e => setFormData({...formData, port: e.target.value})} /></Col>
                  <Col><FormField label="RAM (MB)" type="number" value={formData.ram} icon={Cpu} onChange={e => setFormData({...formData, ram: e.target.value})} /></Col>
                </Row>
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-muted">GAMEMODE</Form.Label>
                <Form.Select className="rounded-3 border-0 bg-light p-2 shadow-sm mb-3 text-dark" value={formData.gamemode} onChange={e => setFormData({...formData, gamemode: e.target.value})}>
                  <option value="survival">Survival</option><option value="creative">Creative</option>
                </Form.Select>
                <Form.Check type="switch" label="Allow Cheats" checked={formData.cheats} onChange={e => setFormData({...formData, cheats: e.target.checked})} className="fw-bold text-muted" />
              </Col>
            </Row>
            <Button variant="primary" type="submit" className="w-100 py-3 fw-bold rounded-pill border-0 mt-4 shadow">LAUNCH SERVER</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}