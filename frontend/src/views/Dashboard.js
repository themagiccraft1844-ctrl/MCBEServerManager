import React from 'react';
import { Row, Col, Card, Button, ProgressBar, Alert, InputGroup, Spinner, Form } from 'react-bootstrap';
import { Plus, Play, Square, Trash2, Server, Copy, Settings2 } from 'lucide-react';

// Import modular (Abaikan laporan error di Canvas Preview, ini sudah benar untuk struktur lokal Anda)
import { StatusBadge } from '../components/UIAssets';

const DashboardView = ({ 
  servers = [], 
  isCreating = false, 
  pullInfo = {}, 
  onAction, 
  onOpenCreate, 
  onManage, 
  actionLoading = {}, 
  showToast 
}) => (
  <div className="animate-fade-in">
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="fw-bold m-0 text-dark">Daftar Kontainer</h4>
        <small className="text-muted">Kelola server Minecraft Anda secara real-time</small>
      </div>
      <Button variant="primary" onClick={onOpenCreate} className="rounded-pill shadow-sm px-4 fw-bold border-0 py-2 text-white">
        <Plus size={20} className="me-1" /> Deploy Server
      </Button>
    </div>

    {/* Indikator Progres Unduhan Image (Docker Pull) */}
    {isCreating && (
      <Alert variant="primary" className="border-0 shadow-sm mb-4 bg-white">
        <div className="d-flex align-items-center justify-content-between mb-2 text-primary">
          <span className="fw-bold">
            <Spinner size="sm" animation="border" className="me-2" /> {pullInfo?.message || 'Mengunduh data...'}
          </span>
          <span className="badge bg-primary px-3 rounded-pill">{Math.round(pullInfo?.progress || 0)}%</span>
        </div>
        <ProgressBar animated now={pullInfo?.progress || 0} variant="primary" style={{ height: '8px' }} className="rounded-pill" />
      </Alert>
    )}

    {(!servers || servers.length === 0) && !isCreating && (
      <div className="text-center py-5 opacity-50 bg-white rounded-4 shadow-sm border">
        <Server size={64} className="text-muted mb-3" />
        <p className="fw-bold text-muted">Belum ada server. Klik "Deploy Server" untuk memulai.</p>
      </div>
    )}

    <Row className="g-4">
      {Array.isArray(servers) && servers.map((server) => {
        const isRunning = server?.status === 'running';
        const isLoading = actionLoading ? actionLoading[server?.id] : false;

        return (
          <Col md={6} lg={4} key={server?.id || Math.random()}>
            <Card className={`border-0 shadow-sm h-100 transition-all ${isLoading ? 'opacity-75' : ''}`}>
              <Card.Body className="d-flex flex-column p-4">
                <div className="d-flex justify-content-between mb-3 align-items-start">
                  <h5 className="fw-bold m-0 text-capitalize text-truncate" style={{maxWidth: '180px'}}>{server?.name}</h5>
                  <StatusBadge status={server?.status} isLoading={isLoading} />
                </div>

                <div className="bg-light p-3 rounded-3 mb-4">
                  <small className="text-muted d-block mb-1 font-monospace" style={{fontSize: '10px'}}>ALAMAT SERVER</small>
                  <InputGroup size="sm">
                    <Form.Control 
                      readOnly 
                      value={server?.address || ''} 
                      className="bg-transparent border-0 font-monospace fw-bold p-0 shadow-none text-dark" 
                    />
                    <Button variant="link" className="text-primary p-0 ms-2" onClick={() => {
                      if (server?.address) {
                        // Menggunakan execCommand untuk menyalin teks (fallback untuk iFrame)
                        const el = document.createElement('textarea');
                        el.value = server.address;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        showToast && showToast("Alamat disalin!", "success");
                      }
                    }}><Copy size={16} /></Button>
                  </InputGroup>
                </div>

                <div className="mt-auto pt-3 border-top d-flex gap-2">
                  {!isRunning ? (
                    <Button 
                      variant="success" 
                      className="w-100 fw-bold rounded-3 border-0 py-2 shadow-sm text-white" 
                      disabled={isLoading} 
                      onClick={() => onAction && onAction(server?.id, 'start')}
                    >
                      {isLoading ? <Spinner size="sm" /> : <><Play size={16} className="me-1" /> Start</>}
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      className="w-100 fw-bold rounded-3 border-0 py-2 shadow-sm text-white" 
                      disabled={isLoading} 
                      onClick={() => onManage && onManage(server)}
                    >
                      <Settings2 size={16} className="me-1" /> Manage
                    </Button>
                  )}
                  <Button 
                    variant="light" 
                    className="text-danger border-0 rounded-3 px-3 shadow-sm" 
                    disabled={isLoading || isRunning} 
                    onClick={() => onAction && onAction(server?.id, 'delete')}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  </div>
);

export default DashboardView;