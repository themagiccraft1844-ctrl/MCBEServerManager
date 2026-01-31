// ============================================================
// LOKASI FILE: frontend/src/App.jsx (Main Entry Point)
// ============================================================
import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, Modal, Form, 
  ProgressBar, Alert, InputGroup, Spinner, Toast, ToastContainer, Nav, Navbar 
} from 'react-bootstrap';
import { 
  Plus, Play, Square, Trash2, Upload, Server, Activity, 
  Copy, AlertTriangle, ShieldCheck, LogOut, Settings, Globe, Cpu 
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000';
const socket = io(API_BASE);

// ------------------------------------------------------------
// MODUL 1: UI ASSETS (Bisa dipindah ke: src/components/UIAssets.js)
// ------------------------------------------------------------

const StatusBadge = ({ status, isLoading }) => {
  if (isLoading) return <Badge bg="info" className="animate-pulse">MEMPROSES...</Badge>;
  return (
    <Badge bg={status === 'running' ? 'success' : 'secondary'} className="rounded-pill px-3">
      {status ? status.toUpperCase() : 'OFFLINE'}
    </Badge>
  );
};

const FormField = ({ label, icon: Icon, ...props }) => (
  <Form.Group className="mb-3">
    <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-1">
      {Icon && <Icon size={14} />} {label}
    </Form.Label>
    <Form.Control {...props} className="rounded-3 shadow-sm" />
  </Form.Group>
);

const CustomToast = ({ show, onClose, message, variant }) => (
  <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
    <Toast onClose={onClose} show={show} delay={3000} autohide bg={variant}>
      <Toast.Body className="text-white fw-bold">{message}</Toast.Body>
    </Toast>
  </ToastContainer>
);

// ------------------------------------------------------------
// MODUL 2: LOGIN VIEW (Bisa dipindah ke: src/views/Login.js)
// ------------------------------------------------------------

const LoginView = ({ onLogin }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (creds.username === 'admin' && creds.password === 'admin') {
      onLogin();
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card className="border-0 shadow-lg p-5 text-center" style={{ maxWidth: '420px', width: '100%', borderRadius: '20px' }}>
        <div className="bg-primary text-white d-inline-flex p-4 rounded-circle mb-4 shadow-sm mx-auto">
          <ShieldCheck size={48} />
        </div>
        <h2 className="fw-bold mb-1">Mine-Panel</h2>
        <p className="text-muted mb-4 small">Sistem Manajemen Server Bedrock</p>
        <Form onSubmit={handleSubmit} className="text-start">
          <FormField label="USERNAME" placeholder="admin" required onChange={e => setCreds({...creds, username: e.target.value})} />
          <FormField label="PASSWORD" type="password" placeholder="admin" required onChange={e => setCreds({...creds, password: e.target.value})} />
          <Button variant="primary" type="submit" className="w-100 py-3 fw-bold rounded-pill shadow-sm mt-3">MASUK PANEL</Button>
        </Form>
      </Card>
    </Container>
  );
};

// ------------------------------------------------------------
// MODUL 3: DASHBOARD VIEW (Bisa dipindah ke: src/views/Dashboard.js)
// ------------------------------------------------------------

const DashboardView = ({ servers, isCreating, pullInfo, onAction, onOpenCreate, actionLoading, showToast }) => (
  <>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h4 className="fw-bold m-0"><Activity size={22} className="me-2 text-primary" /> Status Server</h4>
      <Button variant="primary" onClick={onOpenCreate} className="rounded-pill shadow-sm px-4 fw-bold">
        <Plus size={20} /> Deploy Baru
      </Button>
    </div>

    {isCreating && (
      <Alert variant="primary" className="border-0 shadow-sm mb-4 bg-white">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-bold text-primary"><Spinner size="sm" className="me-2" /> {pullInfo.message}</span>
          <span className="badge bg-primary px-3">{Math.round(pullInfo.progress)}%</span>
        </div>
        <ProgressBar animated now={pullInfo.progress} variant="primary" style={{ height: '8px' }} className="rounded-pill" />
      </Alert>
    )}

    <Row className="g-4">
      {servers.map((server) => {
        const isRunning = server.status === 'running';
        const isLoading = actionLoading[server.id];

        return (
          <Col md={6} lg={4} key={server.id}>
            <Card className={`border-0 shadow-sm h-100 ${isLoading ? 'opacity-75' : ''}`}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between mb-3">
                  <h5 className="fw-bold m-0 text-capitalize">{server.name}</h5>
                  <StatusBadge status={server.status} isLoading={isLoading} />
                </div>

                <div className="bg-light p-3 rounded-3 mb-4">
                  <small className="text-muted d-block mb-1 font-monospace" style={{fontSize: '10px'}}>IP & PORT</small>
                  <InputGroup size="sm">
                    <Form.Control readOnly value={server.address} className="bg-transparent border-0 font-monospace fw-bold" />
                    <Button variant="outline-primary" className="border-0" onClick={() => {
                      navigator.clipboard.writeText(server.address);
                      showToast("Alamat disalin!", "info");
                    }}><Copy size={16} /></Button>
                  </InputGroup>
                </div>

                <div className="mt-auto pt-3 border-top d-flex gap-2">
                  {!isRunning ? (
                    <Button variant="success" className="w-100 fw-bold" disabled={isLoading} onClick={() => onAction(server.id, 'start')}>
                      {isLoading ? <Spinner size="sm" /> : <><Play size={16} /> Mulai</>}
                    </Button>
                  ) : (
                    <Button variant="outline-danger" className="w-100 fw-bold" disabled={isLoading} onClick={() => onAction(server.id, 'stop')}>
                      {isLoading ? <Spinner size="sm" /> : <><Square size={16} /> Berhenti</>}
                    </Button>
                  )}
                  <Button variant="light" className="text-danger border" disabled={isLoading || isRunning} onClick={() => onAction(server.id, 'delete')}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  </>
);

// ------------------------------------------------------------
// MAIN APP COMPONENT (Logika Navigasi & Global State)
// ------------------------------------------------------------

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('dashboard'); // dashboard | settings

  const [servers, setServers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serverToDelete, setServerToDelete] = useState(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [pullInfo, setPullInfo] = useState({ message: '', progress: 0 });
  const [formData, setFormData] = useState({ name: '', port: '19132', ram: '2048', domain: '' });
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [actionLoading, setActionLoading] = useState({}); 

  const showToast = (message, variant = 'success') => setToast({ show: true, message, variant });

  const fetchServers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/servers`);
      setServers(res.data);
    } catch (err) { console.error("API Error"); }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchServers();
    const interval = setInterval(fetchServers, 3000);
    socket.on('pull-status', (data) => {
      setPullInfo(data);
      if (data.progress === 100) {
        showToast("Deployment Selesai!", "success");
        setTimeout(() => { setIsCreating(false); setPullInfo({ message: '', progress: 0 }); fetchServers(); }, 3000);
      }
    });
    return () => { clearInterval(interval); socket.off('pull-status'); };
  }, [isLoggedIn]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setShowModal(false);
    setIsCreating(true);
    try {
      await axios.post(`${API_BASE}/api/servers`, formData);
    } catch (err) {
      showToast("Gagal deploy", "danger");
      setIsCreating(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === 'delete') {
      setServerToDelete(servers.find(s => s.id === id));
      setShowDeleteModal(true);
      return;
    }
    executeAction(id, action);
  };

  const executeAction = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await axios.post(`${API_BASE}/api/servers/${id}/${action}`);
      showToast(`Aksi ${action} diproses`);
      await fetchServers();
    } catch (err) {
      showToast("Gagal aksi", "danger");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
      if (action === 'delete') setShowDeleteModal(false);
    }
  };

  if (!isLoggedIn) return <LoginView onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="bg-light min-vh-100">
      <CustomToast {...toast} onClose={() => setToast({ ...toast, show: false })} />

      <Navbar bg="white" className="shadow-sm mb-4 px-3 sticky-top">
        <Container>
          <Navbar.Brand className="fw-bold text-primary d-flex align-items-center">
            <Server className="me-2" /> Mine-Panel <small className="ms-2 text-muted fw-normal">v1.2</small>
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link onClick={() => setView('dashboard')} active={view === 'dashboard'}>Dashboard</Nav.Link>
            <Nav.Link onClick={() => setView('settings')} active={view === 'settings'}>Settings</Nav.Link>
          </Nav>
          <Button variant="outline-danger" size="sm" className="rounded-pill px-3" onClick={() => setIsLoggedIn(false)}>
            <LogOut size={14} className="me-1" /> Logout
          </Button>
        </Container>
      </Navbar>

      <Container>
        {view === 'dashboard' ? (
          <DashboardView 
            servers={servers} isCreating={isCreating} pullInfo={pullInfo} 
            onAction={handleAction} onOpenCreate={() => setShowModal(true)}
            actionLoading={actionLoading} showToast={showToast}
          />
        ) : (
          <Card className="border-0 shadow-sm p-5 text-center bg-white rounded-4">
            <Settings size={64} className="text-primary mb-3 mx-auto" />
            <h4 className="fw-bold">Pengaturan Global</h4>
            <p className="text-muted">Manajemen RAM default dan keamanan panel.</p>
            <hr />
            <div className="text-start" style={{maxWidth: '400px', margin: '0 auto'}}>
              <FormField label="DEFAULT RAM LIMIT (MB)" type="number" defaultValue="2048" icon={Cpu} />
              <FormField label="CUSTOM DOMAIN" type="text" placeholder="mc.domain.com" icon={Globe} />
              <Button variant="primary" className="w-100 rounded-pill fw-bold py-2 mt-3 shadow-sm">SIMPAN KONFIGURASI</Button>
            </div>
          </Card>
        )}
      </Container>

      {/* MODAL: CREATE SERVER */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Body className="p-4">
          <h4 className="fw-bold mb-4 text-primary d-flex align-items-center gap-2">
            <Plus className="bg-primary text-white p-1 rounded-2" /> Deployment Baru
          </h4>
          <Form onSubmit={handleCreate}>
            <FormField label="NAMA SERVER" placeholder="Survival-World" required onChange={e => setFormData({...formData, name: e.target.value})} />
            <Row>
              <Col><FormField label="PORT (UDP)" type="number" defaultValue="19132" required onChange={e => setFormData({...formData, port: e.target.value})} /></Col>
              <Col><FormField label="RAM (MB)" type="number" defaultValue="2048" icon={Cpu} required onChange={e => setFormData({...formData, ram: e.target.value})} /></Col>
            </Row>
            <FormField label="CUSTOM DOMAIN (OPSIONAL)" icon={Globe} placeholder="mcb.myserver.com" onChange={e => setFormData({...formData, domain: e.target.value})} />
            <Button variant="primary" type="submit" className="w-100 py-3 fw-bold shadow-sm rounded-pill mt-3">LAUNCH SERVER</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL: DELETE */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="p-4 text-center">
          <AlertTriangle size={54} className="text-danger mb-3" />
          <h5 className="fw-bold">Hapus Server?</h5>
          <p className="text-muted small">Data <strong>{serverToDelete?.name}</strong> akan hilang.</p>
          <div className="d-grid gap-2">
            <Button variant="danger" className="fw-bold" onClick={() => executeAction(serverToDelete.id, 'delete')}>Ya, Hapus</Button>
            <Button variant="light" onClick={() => setShowDeleteModal(false)}>Batal</Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}