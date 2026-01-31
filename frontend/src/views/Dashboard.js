import React from 'react';
import { Row, Col, Card, Button, ProgressBar, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { Plus, Play, Square, Trash2, Server, Copy, Activity } from 'lucide-react';
import { StatusBadge } from '../components/UIAssets';

const DashboardView = ({ servers, isCreating, pullInfo, onAction, onOpenCreate, actionLoading, showToast }) => (
  <>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="fw-bold m-0 text-dark">Daftar Kontainer</h4>
        <small className="text-muted">Kelola server Minecraft Anda secara real-time</small>
      </div>
      <Button variant="primary" onClick={onOpenCreate} className="rounded-pill shadow-sm px-4 fw-bold border-0 py-2">
        <Plus size={20} className="me-1" /> Deploy Server
      </Button>
    </div>

    {/* Indikator Progress Pulling */}
    {isCreating && (
      <Alert variant="primary" className="border-0 shadow-sm mb-4 bg-white">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-bold text-primary">
            <Spinner size="sm" className="me-2" /> {pullInfo.message || 'Mengunduh data...'}
          </span>
          <span className="badge bg-primary px-3 rounded-pill">{Math.round(pullInfo.progress)}%</span>
        </div>
        <ProgressBar animated now={pullInfo.progress} variant="primary" style={{ height: '8px' }} className="rounded-pill" />
      </Alert>
    )}

    {servers.length === 0 && !isCreating && (
      <div className="text-center py-5 opacity-50">
        <Server size={64} className="text-muted mb-3" />
        <p>Belum ada server. Klik "Deploy Server" untuk memulai.</p>
      </div>
    )}

    <Row className="g-4">
      {servers.map((server) => {
        const isRunning = server.status === 'running';
        const isLoading = actionLoading[server.id];

        return (
          <Col md={6} lg={4} key={server.id}>
            <Card className={`border-0 shadow-sm h-100 transition-all ${isLoading ? 'opacity-75' : ''}`}>
              <Card.Body className="d-flex flex-column p-4">
                <div className="d-flex justify-content-between mb-3 align-items-start">
                  <h5 className="fw-bold m-0 text-capitalize text-truncate" style={{maxWidth: '180px'}}>{server.name}</h5>
                  <StatusBadge status={server.status} isLoading={isLoading} />
                </div>

                <div className="bg-light p-3 rounded-3 mb-4">
                  <small className="text-muted d-block mb-1 font-monospace" style={{fontSize: '10px'}}>ALAMAT SERVER</small>
                  <InputGroup size="sm">
                    <Form.Control readOnly value={server.address} className="bg-transparent border-0 font-monospace fw-bold p-0 shadow-none" />
                    <Button variant="link" className="text-primary p-0 ms-2" onClick={() => {
                      navigator.clipboard.writeText(server.address);
                      showToast("Alamat disalin!", "success");
                    }}><Copy size={16} /></Button>
                  </InputGroup>
                </div>

                <div className="mt-auto pt-3 border-top d-flex gap-2">
                  {!isRunning ? (
                    <Button variant="success" className="w-100 fw-bold rounded-3 border-0 py-2" disabled={isLoading} onClick={() => onAction(server.id, 'start')}>
                      {isLoading ? <Spinner size="sm" /> : <><Play size={16} className="me-1" /> Start</>}
                    </Button>
                  ) : (
                    <Button variant="outline-danger" className="w-100 fw-bold rounded-3 py-2" disabled={isLoading} onClick={() => onAction(server.id, 'stop')}>
                      {isLoading ? <Spinner size="sm" /> : <><Square size={16} className="me-1" /> Stop</>}
                    </Button>
                  )}
                  <Button variant="light" className="text-danger border-0 rounded-3 px-3" disabled={isLoading || isRunning} onClick={() => onAction(server.id, 'delete')}>
                    <Trash2 size={18} />
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

export default DashboardView;