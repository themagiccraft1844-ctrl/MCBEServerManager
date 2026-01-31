import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Settings as SettingsIcon, Cpu, Globe } from 'lucide-react';
import { FormField } from '../components/UIAssets';

const SettingsView = () => {
  return (
    <Row className="justify-content-center">
      <Col md={8}>
        <Card className="border-0 shadow-sm p-5 text-center bg-white rounded-4">
          <div className="bg-light text-primary p-4 rounded-circle d-inline-block mb-4">
            <SettingsIcon size={48} />
          </div>
          <h4 className="fw-bold">Konfigurasi Panel Pro</h4>
          <p className="text-muted mb-4">Atur limitasi sumber daya dan keamanan global server Anda.</p>
          <hr />
          <div className="text-start mx-auto" style={{maxWidth: '450px'}}>
            <FormField 
              label="DEFAULT RAM LIMIT (MB)" 
              type="number" 
              defaultValue="2048" 
              icon={Cpu} 
            />
            <FormField 
              label="CUSTOM DOMAIN" 
              type="text" 
              placeholder="mc.panel-saya.com" 
              icon={Globe} 
            />
            <div className="d-grid mt-4">
              <Button variant="primary" className="fw-bold py-2 rounded-pill shadow-sm border-0">
                SIMPAN KONFIGURASI
              </Button>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default SettingsView;