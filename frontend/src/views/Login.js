import React, { useState } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import { ShieldCheck } from 'lucide-react';
import { FormField } from '../components/UIAssets';

const LoginView = ({ onLogin }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ganti dengan logika autentikasi API beneran nanti
    if (creds.username === 'admin' && creds.password === 'admin') {
      onLogin();
    } else {
      alert("Kredensial salah! Gunakan admin/admin.");
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card className="border-0 shadow-lg p-5 text-center" style={{ maxWidth: '420px', width: '100%', borderRadius: '24px' }}>
        <div className="bg-primary text-white d-inline-flex p-4 rounded-circle mb-4 shadow-sm mx-auto">
          <ShieldCheck size={48} />
        </div>
        <h2 className="fw-bold mb-1">Mine-Panel</h2>
        <p className="text-muted mb-4 small">Panel Manajemen Server Minecraft</p>
        <Form onSubmit={handleSubmit}>
          <FormField 
            label="USERNAME" 
            placeholder="admin" 
            required 
            onChange={e => setCreds({...creds, username: e.target.value})} 
          />
          <FormField 
            label="PASSWORD" 
            type="password" 
            placeholder="admin" 
            required 
            onChange={e => setCreds({...creds, password: e.target.value})} 
          />
          <Button variant="primary" type="submit" className="w-100 py-3 fw-bold rounded-pill shadow-sm mt-3 border-0">
            MASUK KE PANEL
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default LoginView;