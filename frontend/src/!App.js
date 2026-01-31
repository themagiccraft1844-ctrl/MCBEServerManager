import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, ProgressBar, Alert, InputGroup, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { Plus, Play, Square, Trash2, Upload, Server, Activity, Copy, AlertTriangle, Info } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000';
const socket = io(API_BASE);

function App() {
  const [servers, setServers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serverToDelete, setServerToDelete] = useState(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [pullInfo, setPullInfo] = useState({ message: '', progress: 0 });
  const [formData, setFormData] = useState({ name: '', port: '19132', seed: '' });
  
  // State untuk notifikasi Toast
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  
  // State untuk melacak server mana yang sedang diproses (Start/Stop/Delete)
  const [actionLoading, setActionLoading] = useState({}); 

  const showToast = (message, variant = 'success') => {
    setToast({ show: true, message, variant });
  };

  const fetchServers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/servers`);
      setServers(res.data);
    } catch (err) { console.error("Koneksi API terputus..."); }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 3000);

    socket.on('pull-status', (data) => {
      setPullInfo(data);
      if (data.progress === 100) {
        showToast(`Server "${data.message.split(' ')[1] || 'Baru'}" berhasil dideploy!`);
        setTimeout(() => {
          setIsCreating(false);
          setPullInfo({ message: '', progress: 0 });
          fetchServers();
        }, 3000);
      }
    });

    return () => {
      clearInterval(interval);
      socket.off('pull-status');
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setShowModal(false);
    setIsCreating(true);
    setPullInfo({ message: 'Menghubungi Docker Engine...', progress: 5 });
    try {
      await axios.post(`${API_BASE}/api/servers`, formData);
    } catch (err) {
      showToast("Gagal membuat server. Cek log backend.", "danger");
      setIsCreating(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === 'delete') {
      const serverObj = servers.find(s => s.id === id);
      setServerToDelete(serverObj);
      setShowDeleteModal(true);
      return;
    }
    
    executeAction(id, action);
  };

  const executeAction = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await axios.post(`${API_BASE}/api/servers/${id}/${action}`);
      showToast(`Aksi ${action} sedang dijalankan...`, "info");
      await fetchServers();
    } catch (err) {
      showToast(`Gagal melakukan ${action}`, "danger");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
      if (action === 'delete') setShowDeleteModal(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Alamat server berhasil disalin!");
  };

  return (
    <Container className="py-4" style={{ backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      {/* Toast Notification Container */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
          onClose={() => setToast({ ...toast, show: false })} 
          show={toast.show} 
          delay={3000} 
          autohide 
          bg={toast.variant}
        >
          <Toast.Body className={toast.variant === 'primary' || toast.variant === 'danger' || toast.variant === 'success' ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark"><Server className="me-2 text-primary" /> Mine-Panel</h2>
          <small className="text-muted">Kelola Server Bedrock Anda dengan Sekali Klik</small>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)} className="rounded-3 shadow-sm px-4 py-2 fw-bold">
          <Plus size={20} className="me-1" /> Buat Server
        </Button>
      </div>

      {isCreating && (
        <Alert variant="primary" className="border-0 shadow-sm mb-4 bg-white">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-bold text-primary">
              <Activity size={18} className="me-2 mb-1" /> 
              {pullInfo.message}
            </span>
            <span className="badge bg-primary px-3">{Math.round(pullInfo.progress)}%</span>
          </div>
          <ProgressBar animated now={pullInfo.progress} variant="primary" style={{ height: '8px' }} className="rounded-pill" />
        </Alert>
      )}

      <Row className="g-3">
        {servers.map((server) => {
          const isRunning = server.status === 'running';
          const isLoading = actionLoading[server.id];

          return (
            <Col md={6} lg={4} key={server.id}>
              <Card className={`border-0 shadow-sm h-100 ${isLoading ? 'opacity-75' : ''}`}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="fw-bold m-0 text-capitalize text-truncate" style={{maxWidth: '180px'}}>{server.name}</h5>
                      <Badge bg={isRunning ? 'success' : 'secondary'} className="mt-1">
                        {isLoading ? 'MEMPROSES...' : server.status.toUpperCase()}
                      </Badge>
                    </div>
                    {isLoading && <Spinner animation="border" size="sm" variant="primary" />}
                  </div>

                  <div className="bg-light p-2 rounded-3 mb-3">
                    <small className="text-muted d-block mb-1 font-monospace" style={{fontSize: '10px'}}>ALAMAT SERVER</small>
                    <InputGroup size="sm">
                      <Form.Control 
                        readOnly 
                        value={server.address} 
                        className="bg-transparent border-0 font-monospace fw-bold" 
                        style={{fontSize: '13px'}}
                      />
                      <Button variant="outline-secondary" className="border-0" onClick={() => copyToClipboard(server.address)}>
                        <Copy size={14} />
                      </Button>
                    </InputGroup>
                  </div>

                  <div className="mt-auto pt-3 border-top d-flex gap-2">
                    {!isRunning ? (
                      <Button 
                        variant="success" 
                        className="w-100 py-2 fw-bold" 
                        disabled={isLoading}
                        onClick={() => handleAction(server.id, 'start')}
                      >
                        {isLoading ? <Spinner animation="border" size="sm" /> : <><Play size={16} className="me-1" /> Mulai</>}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline-danger" 
                        className="w-100 py-2 fw-bold" 
                        disabled={isLoading}
                        onClick={() => handleAction(server.id, 'stop')}
                      >
                        {isLoading ? <Spinner animation="border" size="sm" /> : <><Square size={16} className="me-1" /> Berhenti</>}
                      </Button>
                    )}
                    <Button 
                      variant="light" 
                      className="text-danger border" 
                      disabled={isLoading || isRunning}
                      title={isRunning ? "Matikan server sebelum menghapus" : "Hapus Server"}
                      onClick={() => handleAction(server.id, 'delete')}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  
                  <div className="mt-2 text-center">
                    <input 
                      type="file" 
                      id={`f-${server.name}`} 
                      className="d-none" 
                      disabled={isRunning || isLoading}
                      onChange={(e) => {
                        const data = new FormData();
                        data.append('world', e.target.files[0]);
                        axios.post(`${API_BASE}/api/servers/${server.name}/import`, data);
                        showToast("World sedang diupload...");
                      }} 
                    />
                    <Button 
                      variant="link" 
                      size="sm" 
                      disabled={isLoading || isRunning}
                      className={`w-100 text-decoration-none ${isRunning ? 'text-muted opacity-50' : 'text-muted'}`} 
                      onClick={() => document.getElementById(`f-${server.name}`).click()}
                    >
                      <Upload size={12} className="me-1" /> {isRunning ? 'Matikan server untuk import' : 'Import World'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* MODAL BUAT SERVER */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Body className="p-4">
          <h4 className="fw-bold mb-3">Deploy Server Baru</h4>
          <Form onSubmit={handleCreate}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">NAMA SERVER</Form.Label>
              <Form.Control placeholder="Misal: Survival-Mabar" required onChange={e => setFormData({...formData, name: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-muted">PORT (UDP)</Form.Label>
              <Form.Control type="number" defaultValue="19132" required onChange={e => setFormData({...formData, port: e.target.value})} />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 py-2 fw-bold shadow-sm">
              LUNCURKAN SEKARANG
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="p-4 text-center">
          <div className="text-danger mb-3">
            <AlertTriangle size={48} />
          </div>
          <h5 className="fw-bold">Hapus Server?</h5>
          <p className="text-muted small">
            Server <strong>{serverToDelete?.name}</strong> akan dihapus permanen.
          </p>
          <div className="d-grid gap-2">
            <Button 
              variant="danger" 
              className="fw-bold"
              onClick={() => executeAction(serverToDelete.id, 'delete')}
              disabled={actionLoading[serverToDelete?.id]}
            >
              {actionLoading[serverToDelete?.id] ? <Spinner animation="border" size="sm" /> : 'Ya, Hapus'}
            </Button>
            <Button variant="light" onClick={() => setShowDeleteModal(false)} disabled={actionLoading[serverToDelete?.id]}>
              Batal
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default App;