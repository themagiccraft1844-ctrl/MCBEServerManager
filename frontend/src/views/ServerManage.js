import React, { useState } from 'react';
import { Row, Col, Card, Button, Nav, Tab, Form, Badge, Table, InputGroup } from 'react-bootstrap';
import { ArrowLeft, Terminal, Cpu, HardDrive, Users, Settings, Play, Square, RotateCcw } from 'lucide-react';

const ServerManageView = ({ server, onBack, onAction, actionLoading }) => {
  const [activeTab, setActiveTab] = useState('console');
  const isRunning = server.status === 'running';
  const isLoading = actionLoading[server.id];

  return (
    <div className="animate-fade-in">
      {/* Header Manajemen */}
      <div className="d-flex align-items-center mb-4">
        <Button variant="light" onClick={onBack} className="rounded-circle p-2 me-3 shadow-sm border">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h4 className="fw-bold m-0">{server.name}</h4>
          <small className="text-muted">{server.address}</small>
        </div>
        <div className="ms-auto d-flex gap-2">
           <Button variant={isRunning ? "outline-danger" : "success"} size="sm" className="rounded-pill px-3 fw-bold border-2" disabled={isLoading} onClick={() => onAction(server.id, isRunning ? 'stop' : 'start')}>
             {isRunning ? <Square size={14} className="me-1"/> : <Play size={14} className="me-1"/>}
             {isRunning ? 'Stop' : 'Start'}
           </Button>
           <Button variant="light" size="sm" className="rounded-pill px-3 fw-bold border" disabled={!isRunning || isLoading} onClick={() => onAction(server.id, 'restart')}>
             <RotateCcw size={14} className="me-1"/> Restart
           </Button>
        </div>
      </div>

      {/* Grid Statistik */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 rounded-4">
            <Cpu className="text-primary mb-2 mx-auto" size={24} />
            <div className="small text-muted fw-bold">CPU USAGE</div>
            <h5 className="fw-bold m-0">{isRunning ? '12%' : '0%'}</h5>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 rounded-4">
            <HardDrive className="text-success mb-2 mx-auto" size={24} />
            <div className="small text-muted fw-bold">RAM USAGE</div>
            <h5 className="fw-bold m-0">{isRunning ? '1.2 GB' : '0 MB'}</h5>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 rounded-4">
            <Users className="text-info mb-2 mx-auto" size={24} />
            <div className="small text-muted fw-bold">PLAYERS</div>
            <h5 className="fw-bold m-0">{isRunning ? '5 / 20' : 'Offline'}</h5>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center p-3 rounded-4">
            <Terminal className="text-warning mb-2 mx-auto" size={24} />
            <div className="small text-muted fw-bold">UPTIME</div>
            <h5 className="fw-bold m-0">{isRunning ? '2h 15m' : '-'}</h5>
          </Card>
        </Col>
      </Row>

      {/* Konten Tabbed (Console, Files, Config) */}
      <Card className="border-0 shadow-sm overflow-hidden rounded-4">
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Card.Header className="bg-white border-0 p-0">
            <Nav variant="tabs" className="border-bottom-0">
              <Nav.Item>
                <Nav.Link eventKey="console" className="px-4 py-3 border-0 rounded-0 d-flex align-items-center gap-2">
                  <Terminal size={18} /> Console
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="files" className="px-4 py-3 border-0 rounded-0 d-flex align-items-center gap-2">
                  <HardDrive size={18} /> File Manager
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="config" className="px-4 py-3 border-0 rounded-0 d-flex align-items-center gap-2">
                  <Settings size={18} /> World Config
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>
          <Card.Body className="bg-dark p-0" style={{ minHeight: '400px' }}>
            <Tab.Content>
              <Tab.Pane eventKey="console" className="p-3">
                <div className="font-monospace text-light small p-3 bg-black rounded-3 mb-3" style={{ height: '350px', overflowY: 'auto' }}>
                  <div className="text-success">[INFO] Starting Minecraft server...</div>
                  <div className="text-info">[INFO] Server started on port {server.port}</div>
                  <div className="text-light opacity-50">_</div>
                </div>
                <InputGroup>
                  <Form.Control 
                    placeholder="Ketik perintah console..." 
                    className="bg-secondary border-0 text-white shadow-none"
                  />
                  <Button variant="warning" className="fw-bold">KIRIM</Button>
                </InputGroup>
              </Tab.Pane>
              <Tab.Pane eventKey="files" className="bg-white p-4">
                 <h6 className="fw-bold mb-3 text-dark">File Root Server</h6>
                 <Table responsive hover className="small">
                   <thead>
                     <tr>
                       <th>Nama File</th>
                       <th>Ukuran</th>
                       <th>Aksi</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr><td>server.properties</td><td>2 KB</td><td><Button size="sm" variant="link">Edit</Button></td></tr>
                     <tr><td>whitelist.json</td><td>1 KB</td><td><Button size="sm" variant="link">Edit</Button></td></tr>
                     <tr><td>world/</td><td>-</td><td><Button size="sm" variant="link">Buka</Button></td></tr>
                   </tbody>
                 </Table>
              </Tab.Pane>
              <Tab.Pane eventKey="config" className="bg-white p-4">
                 <h6 className="fw-bold mb-3 text-dark">Konfigurasi Cepat</h6>
                 <Form.Check type="switch" label="PvP Enabled" defaultChecked className="mb-2" />
                 <Form.Check type="switch" label="Spawn Monsters" defaultChecked className="mb-2" />
                 <Form.Check type="switch" label="Allow Flight" className="mb-4" />
                 <Button variant="dark" size="sm" className="rounded-pill text-warning px-4">Simpan Perubahan</Button>
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Tab.Container>
      </Card>
    </div>
  );
};

export default ServerManageView;