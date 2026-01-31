import React from 'react';
import { Row, Col, Card, Button, Alert, Spinner, InputGroup, Form } from 'react-bootstrap';
import { Plus, Settings2, Play, Copy } from 'lucide-react';
import { StatusBadge } from '../components/UIAssets';

// Exclude manager containers just in case upstream didn't filter
const EXCLUDE_CONTAINERS = ['manager-ui', 'manager-api', 'mc-manager-ui', 'mc-manager-api'];
const isManaged = (s) => {
  if (!s) return false;
  const n = (s.name || '').toLowerCase();
  const id = (s.id || '').toLowerCase();
  return !EXCLUDE_CONTAINERS.some(ex => n.includes(ex) || id.includes(ex));
};

const DashboardView = ({ servers, onAction, onManage, onOpenCreate, actionLoading, showToast, globalStatus }) => {
  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold m-0 text-dark">Node Server</h4>
          <small className="text-muted">Daftar container Minecraft yang aktif</small>
        </div>
        <Button variant="primary" onClick={onOpenCreate} className="rounded-pill shadow-sm px-4 fw-bold border-0 py-2 text-white">
          <Plus size={20} className="me-1" /> Deploy Server
        </Button>
      </div>

      {globalStatus && (
        <Alert variant={globalStatus.type === 'error' ? 'danger' : globalStatus.type === 'info' ? 'primary' : 'success'} className="shadow-sm border-0 mb-4">
          <div className="d-flex align-items-center">
            {globalStatus.type === 'info' && <Spinner size="sm" className="me-2" />}
            <strong>{globalStatus.msg}</strong>
          </div>
        </Alert>
      )}

      {(!servers || servers.length === 0) && !globalStatus && (
        <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
          <p className="fw-bold text-muted mb-0">Belum ada server. Klik Deploy untuk memulai.</p>
        </div>
      )}

      <Row className="g-4">
        {((servers || []).filter(isManaged)).map((server) => {
          const isRunning = (server?.status || '').toLowerCase() === 'running';
          const isLoading = actionLoading?.[server.id];

          return (
            <Col md={6} lg={4} key={server.id}>
              <Card className={`border-0 shadow-sm h-100 transition-all ${isLoading ? 'opacity-75' : ''}`}>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="d-flex justify-content-between mb-3 align-items-start">
                    <h5 className="fw-bold m-0 text-capitalize text-truncate" style={{maxWidth: '180px'}}>{server.name}</h5>
                    <StatusBadge status={server.status} isLoading={isLoading} />
                  </div>

                  <div className="bg-light p-3 rounded-3 mb-4">
                    <small className="text-muted d-block mb-1 font-monospace" style={{fontSize: '10px'}}>IP PUBLIC</small>
                    <InputGroup size="sm">
                      <Form.Control 
                        readOnly 
                        value={`${server.address}:${server.port}`} 
                        className="bg-transparent border-0 font-monospace fw-bold p-0 shadow-none text-dark" 
                      />
                      <Button variant="link" className="text-primary p-0 ms-2" onClick={() => {
                        navigator.clipboard.writeText(`${server.address}:${server.port}`);
                        showToast("Alamat disalin!", "success");
                      }}><Copy size={16} /></Button>
                    </InputGroup>
                  </div>

                  <div className="mt-auto pt-3 border-top">
                    {!isRunning ? (
                      <Button 
                        variant="success" 
                        className="w-100 fw-bold rounded-3 border-0 py-2 shadow-sm text-white" 
                        disabled={isLoading} 
                        onClick={() => onAction(server.id, 'start')}
                      >
                        {isLoading ? <Spinner size="sm" /> : <><Play size={16} className="me-1" /> Start Server</>}
                      </Button>
                    ) : (
                      <Button 
                        variant="primary" 
                        className="w-100 fw-bold rounded-3 border-0 py-2 shadow-sm text-white" 
                        disabled={isLoading} 
                        onClick={() => onManage(server)}
                      >
                        <Settings2 size={16} className="me-1" /> Kelola & Console
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default DashboardView;