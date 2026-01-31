import React, { useState } from 'react';
import { Row, Col, Card, Button, Form } from 'react-bootstrap';
import { Settings as SettingsIcon, Cpu, Shield, Lock } from 'lucide-react';

// Import modular (Penyebab auto-fix error di Canvas, tapi wajib untuk project lokal)
import { FormField } from '../components/UIAssets';

const SettingsView = ({ sessionConfig, onUpdateSettings }) => {
  const defaultConfig = { timeoutMinutes: 15, ramDefault: 2048, autoLogoutOtherDevices: false };
  const [localSettings, setLocalSettings] = useState(() => ({ ...(sessionConfig || defaultConfig) }));
  const [newPassword, setNewPassword] = useState('');

  const handleSave = () => {
    const payload = { ...localSettings };
    if (newPassword) payload.password = newPassword;
    if (typeof onUpdateSettings === 'function') onUpdateSettings(payload);
    setNewPassword('');
  };

  return (
    <Row className="justify-content-center animate-fade-in">
      <Col md={8}>
        <Card className="border-0 shadow-sm p-4 rounded-4 bg-white mb-4">
          <div className="d-flex align-items-center gap-2 mb-4 text-primary">
            <Shield size={24} />
            <h4 className="fw-bold m-0 text-dark">Pengaturan Keamanan & Sesi</h4>
          </div>
          
          <Row>
            <Col md={6}>
              <FormField 
                label="TIMEOUT SESI (Menit)" 
                type="number" 
                value={localSettings.timeoutMinutes} 
                icon={SettingsIcon}
                onChange={e => setLocalSettings({...localSettings, timeoutMinutes: parseInt(e.target.value) || 0})}
              />
            </Col>
            <Col md={6}>
              <FormField 
                label="DEFAULT RAM (MB)" 
                type="number" 
                value={localSettings.ramDefault} 
                icon={Cpu}
                onChange={e => setLocalSettings({...localSettings, ramDefault: parseInt(e.target.value) || 0})}
              />
            </Col>
          </Row>

          <Form.Check 
            type="switch"
            id="single-session-switch"
            label="Single Session (Logout otomatis device lain)"
            checked={localSettings.autoLogoutOtherDevices}
            onChange={e => setLocalSettings({...localSettings, autoLogoutOtherDevices: e.target.checked})}
            className="mb-4 fw-bold text-muted"
          />

          <hr className="my-4" />

          <div className="d-flex align-items-center gap-2 mb-3 text-danger">
            <Lock size={20} />
            <h5 className="fw-bold m-0 text-dark">Ubah Password Administrator</h5>
          </div>
          <FormField 
            label="PASSWORD BARU" 
            type="password" 
            placeholder="Biarkan kosong jika tidak ingin mengubah"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />

          <div className="d-grid mt-4">
            <Button variant="primary" className="fw-bold py-2 rounded-pill shadow-sm border-0 text-white" onClick={handleSave}>
              SIMPAN SEMUA KONFIGURASI
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default SettingsView;