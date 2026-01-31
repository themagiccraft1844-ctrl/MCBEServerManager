import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Tab, Tabs, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { ArrowLeft, Terminal, HardDrive, Settings, Play, Square, RotateCcw, Trash2, Save, Download, Upload, AlertTriangle } from 'lucide-react';
import axios from 'axios';

// --- SUB-COMPONENTS (TABS) ---

const ConsoleTab = ({ serverId, isRunning, socket, showToast }) => {
  const [logs, setLogs] = useState([]);
  const [cmd, setCmd] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!isRunning || !socket) return;
    setLogs(['Menghubungkan ke stream server...']);
    socket.emit('attach-console', serverId);
    
    const handleLog = (data) => setLogs(prev => [...prev.slice(-200), data]);
    socket.on('console-out', handleLog);
    return () => socket.off('console-out', handleLog);
  }, [serverId, isRunning, socket]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const sendCommand = (e) => {
    e.preventDefault?.();
    if (!cmd.trim() || !socket) return;
    socket.emit('send-command', { containerId: serverId, command: cmd });
    setCmd('');
  };

  return (
    <Card className="border-0 shadow-sm rounded-bottom rounded-0">
      <Card.Body className="bg-dark p-0">
        <div className="p-3 font-monospace text-light" style={{height: '400px', overflowY: 'auto', fontSize: '13px', whiteSpace: 'pre-wrap'}}>
          {!isRunning && <div className="text-warning text-center mt-5">SERVER OFFLINE - NYALAKAN UNTUK MELIHAT CONSOLE</div>}
          {logs.map((l, i) => <div key={i}>{l}</div>)}
          <div ref={logsEndRef} />
        </div>
        <div className="p-3 bg-secondary bg-opacity-25 border-top border-secondary">
          <Form onSubmit={sendCommand}>
            <InputGroup>
              <Button variant="info" className="fw-bold text-white" disabled={!isRunning || !socket} onClick={() => {
                 const p = prompt("Masukkan Gamertag Player untuk dijadikan Operator:"); 
                 if(p && socket) socket.emit('send-command', { containerId: serverId, command: `op "${p}"` });
              }}>+ OP</Button>
              <Form.Control 
                className="bg-dark text-white border-0 shadow-none font-monospace" 
                placeholder={isRunning ? "Ketik perintah (contoh: gamemode 1 steve)..." : "Server mati"}
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                disabled={!isRunning || !socket}
              />
              <Button type="submit" variant="warning" className="fw-bold" disabled={!isRunning || !socket}>KIRIM</Button>
            </InputGroup>
          </Form>
        </div>
      </Card.Body>
    </Card>
  );
};

const ConfigTab = ({ serverName, apiBase, showToast }) => {
  const [props, setProps] = useState({});
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!serverName) { setLoading(false); return; }
    const encoded = encodeURIComponent(serverName);
    axios.get(`${apiBase}/api/servers/${encoded}/properties`)
      .then(res => setProps(res.data || {}))
      .catch(() => showToast("Gagal memuat konfigurasi", "danger"))
      .finally(() => setLoading(false));
  }, [serverName, apiBase, showToast]);

  const detectDangerousChange = (oldProps = {}, newProps = {}) => {
    if ((oldProps['level-seed'] || oldProps['seed'] || '') !== (newProps['level-seed'] || newProps['seed'] || '')) return true;
    if ((oldProps['experimental-gameplay'] || '') !== (newProps['experimental-gameplay'] || '')) return true;
    if ((oldProps['bonus-chest'] || '') !== (newProps['bonus-chest'] || '')) return true;
    return false;
  };

  const handleSave = async () => {
    try {
      const encoded = encodeURIComponent(serverName);
      await axios.post(`${apiBase}/api/servers/${encoded}/properties`, props);
      showToast("Konfigurasi disimpan. Silakan Restart server.", "success");
    } catch (err) { showToast("Gagal menyimpan konfigurasi", "danger"); }
  };

  const onClickSave = () => {
    // compare with last loaded snapshot
    const original = props._original || {};
    if (detectDangerousChange(original, props)) {
      setShowConfirm(true);
      return;
    }
    handleSave();
  };

  useEffect(() => {
    // attach a copy of initial props for comparison
    setProps(p => ({ ...p, _original: { ...(p || {}) } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) return <div className="text-center my-5"><Spinner animation="border" /></div>;

  return (
    <>
    <Card className="border-0 shadow-sm p-4">
      <Alert variant="info" className="d-flex align-items-center mb-4">
        <AlertTriangle size={20} className="me-2"/>
        <div className="small">
          <strong>Info:</strong> Mengubah <code>seed</code> atau opsi dunia dapat berisiko — lakukan backup sebelum melanjutkan.
        </div>
      </Alert>
      <Row className="g-3">
        <Col md={6}><Form.Label className="small fw-bold">Server Name</Form.Label><Form.Control value={props['server-name']||''} onChange={e=>setProps({...props, 'server-name':e.target.value})}/></Col>
        <Col md={3}><Form.Label className="small fw-bold">Gamemode</Form.Label><Form.Select value={props['gamemode']||'survival'} onChange={e=>setProps({...props, 'gamemode':e.target.value})}><option value="survival">Survival</option><option value="creative">Creative</option></Form.Select></Col>
        <Col md={3}><Form.Label className="small fw-bold">Difficulty</Form.Label><Form.Select value={props['difficulty']||'easy'} onChange={e=>setProps({...props, 'difficulty':e.target.value})}><option value="easy">Easy</option><option value="hard">Hard</option></Form.Select></Col>

        <Col md={6}><Form.Label className="small fw-bold">Seed Dunia</Form.Label><Form.Control value={props['level-seed']||props['seed']||''} onChange={e=>setProps({...props, 'level-seed':e.target.value})}/></Col>
        <Col md={6}><Form.Label className="small fw-bold">Max Players</Form.Label><Form.Control type="number" value={props['max-players']||''} onChange={e=>setProps({...props, 'max-players':e.target.value})}/></Col>

        <Col md={6}><Form.Check type="switch" className="fw-bold mt-2" label="Allow Cheats" checked={props['allow-cheats']==='true'} onChange={e=>setProps({...props, 'allow-cheats':e.target.checked.toString()})}/></Col>
        <Col md={6}><Form.Check type="switch" className="fw-bold mt-2" label="Experimental Gameplay" checked={props['experimental-gameplay']==='true'} onChange={e=>setProps({...props, 'experimental-gameplay':e.target.checked.toString()})}/></Col>

        <Col md={6}><Form.Check type="switch" className="fw-bold mt-2" label="Bonus Chest" checked={props['bonus-chest']==='true'} onChange={e=>setProps({...props, 'bonus-chest':e.target.checked.toString()})}/></Col>
        <Col md={6}><Form.Check type="switch" className="fw-bold mt-2" label="TNT Explodes" checked={props['tnt-explode']==='true'} onChange={e=>setProps({...props, 'tnt-explode':e.target.checked.toString()})}/></Col>

        <Col md={6}><Form.Check type="switch" className="fw-bold mt-2" label="Fire Spreading" checked={props['fire-spread']==='true'} onChange={e=>setProps({...props, 'fire-spread':e.target.checked.toString()})}/></Col>
      </Row>
      <Button className="mt-4 w-100 fw-bold rounded-pill" onClick={onClickSave}><Save size={16} className="me-2"/> SIMPAN PERUBAHAN</Button>
    </Card>

    <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Konfirmasi Perubahan Besar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Perubahan ini (mis. mengubah seed atau mengaktifkan experimental gameplay) dapat mengakibatkan perubahan besar pada dunia atau hilangnya data. Apakah Anda yakin ingin melanjutkan?</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowConfirm(false)}>Urungkan</Button>
        <Button variant="danger" onClick={() => { setShowConfirm(false); handleSave(); }}>Lanjutkan & Simpan</Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

const BackupTab = ({ serverName, apiBase, showToast, isRunning }) => {
  const fileRef = useRef(null);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isRunning) return showToast("Matikan server terlebih dahulu!", "danger");

    const fd = new FormData(); fd.append('world', file);
    try {
       showToast("Mengupload dan mengekstrak world...", "info");
       const encoded = encodeURIComponent(serverName);
       await axios.post(`${apiBase}/api/servers/${encoded}/import`, fd);
       showToast("World berhasil diimport!", "success");
    } catch { showToast("Gagal upload world", "danger"); }
  };

  const downloadBackup = async () => {
    try {
      const encoded = encodeURIComponent(serverName);
      const res = await axios.get(`${apiBase}/api/servers/${encoded}/backup`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${serverName}_backup_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Download backup dimulai", "success");
    } catch (e) { showToast("Gagal mengunduh backup", "danger"); }
  };

  return (
    <Card className="border-0 shadow-sm p-4 text-center">
      <Row className="g-4">
        <Col md={6}>
           <div className="p-4 border rounded-4 bg-light h-100 d-flex flex-column align-items-center justify-content-center">
             <Download size={48} className="mb-3 text-primary"/>
             <h5 className="fw-bold">Backup (Download)</h5>
             <p className="small text-muted">Unduh seluruh data world server ini (format .zip)</p>
             <Button variant="outline-primary" className="fw-bold rounded-pill px-4" onClick={downloadBackup}>Download ZIP</Button>
           </div>
        </Col>
        <Col md={6}>
           <div className="p-4 border rounded-4 bg-light h-100 d-flex flex-column align-items-center justify-content-center">
             <Upload size={48} className={`mb-3 ${isRunning ? "text-muted" : "text-success"}`}/>
             <h5 className="fw-bold">Restore (Upload)</h5>
             <p className="small text-muted">Upload file .zip atau .mcworld. <span className="text-danger">Data lama akan ditimpa!</span></p>
             <input type="file" ref={fileRef} className="d-none" accept=".zip,.mcworld" onChange={handleUpload}/>
             <Button variant={isRunning?"secondary":"success"} className="fw-bold rounded-pill px-4" onClick={()=>fileRef.current?.click()} disabled={isRunning}>Upload & Replace</Button>
           </div>
        </Col>
      </Row>
    </Card>
  );
};

// --- MAIN VIEW ---

const ServerManageView = ({ server, onBack, onAction, actionLoading = {}, socket, showToast, apiBase }) => {
  const [activeTab, setActiveTab] = useState('console');
  if (!server) return null;
  const isRunning = (server?.status || '').toLowerCase() === 'running';

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center mb-4">
        <Button variant="light" onClick={onBack} className="rounded-circle p-2 me-3 shadow-sm border"><ArrowLeft size={20} /></Button>
        <div><h4 className="fw-bold m-0">{server.name}</h4><small className="text-muted">{server.address}:{server.port}</small></div>
        <div className="ms-auto d-flex gap-2">
           <Button variant={isRunning ? "danger" : "success"} className="fw-bold rounded-pill px-4" onClick={() => onAction(server.id, isRunning ? 'stop' : 'start')} disabled={!!actionLoading[server.id]}>
             {isRunning ? <Square size={16} className="me-2"/> : <Play size={16} className="me-2"/>} {isRunning ? 'STOP' : 'START'}
           </Button>
           <Button variant="light" className="border rounded-circle p-2" onClick={() => onAction(server.id, 'restart')} disabled={!!actionLoading[server.id]}><RotateCcw size={20}/></Button>
        </div>
      </div>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4 border-0 bg-white rounded-top shadow-sm px-3 pt-3">
        <Tab eventKey="console" title={<span className="fw-bold"><Terminal size={16} className="me-2"/> CLI / CONSOLE</span>}>
          <ConsoleTab serverId={server.id} isRunning={isRunning} socket={socket} showToast={showToast}/>
        </Tab>
        <Tab eventKey="config" title={<span className="fw-bold"><Settings size={16} className="me-2"/> CONFIG</span>}>
          <ConfigTab serverName={server.name} apiBase={apiBase} showToast={showToast}/>
        </Tab>
        <Tab eventKey="backup" title={<span className="fw-bold"><HardDrive size={16} className="me-2"/> DATA & WORLD</span>}>
          <BackupTab serverName={server.name} apiBase={apiBase} showToast={showToast} isRunning={isRunning}/>
        </Tab>
        <Tab eventKey="danger" title={<span className="fw-bold text-danger"><Trash2 size={16} className="me-2"/> DANGER ZONE</span>}>
           <Card className="p-4 border-0 text-center">
             <h5 className="text-danger fw-bold">Hapus Server</h5>
             <p>Aksi ini akan menghapus container dan memindahkan data ke folder sampah.</p>
             <Button variant="danger" className="fw-bold mx-auto" onClick={()=>onAction(server.id, 'delete')}>HAPUS PERMANEN</Button>
           </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default ServerManageView;