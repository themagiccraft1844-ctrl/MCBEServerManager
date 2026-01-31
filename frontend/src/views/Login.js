import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { ShieldCheck } from 'lucide-react';
import axios from 'axios';

// Komponen Internal untuk input agar tetap self-contained
const FormFieldInternal = ({ label, name, type = "text", placeholder = "", required = false, onChange, autoComplete }) => (
  <Form.Group className="mb-3 text-start">
    <Form.Label className="small fw-bold text-muted ms-2">{label}</Form.Label>
    <Form.Control
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      onChange={onChange}
      autoComplete={autoComplete}
      className="rounded-pill px-4 py-2 bg-light border-0 shadow-sm"
    />
  </Form.Group>
);

const LoginView = ({ onLoginSuccess, apiBase, showToast }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${apiBase}/api/login`, creds);
      onLoginSuccess(res.data);
      if (showToast) showToast("Login Berhasil!", "success");
    } catch (err) {
      const errMsg = err.response?.data?.error || "Username atau password salah.";
      setError(errMsg);
      if (showToast) showToast(errMsg, "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card className="border-0 shadow-lg p-5 text-center" style={{ maxWidth: '420px', width: '100%', borderRadius: '24px' }}>
        <div className="bg-primary text-white d-inline-flex p-4 rounded-circle mb-4 shadow-sm mx-auto">
          <ShieldCheck size={42} />
        </div>
        
        <h2 className="fw-bold mb-1">Mine-Panel Pro</h2>
        <p className="text-muted mb-4 small">Sistem Keamanan Terintegrasi</p>
        
        {error && (
          <Alert variant="danger" className="py-2 small border-0 mb-3 rounded-pill text-dark">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <FormFieldInternal 
            label="USERNAME" 
            name="username"
            placeholder="Masukkan username" 
            required 
            autoComplete="username"
            onChange={e => setCreds({...creds, username: e.target.value})} 
          />
          <FormFieldInternal 
            label="PASSWORD" 
            name="password"
            type="password" 
            placeholder="••••••••" 
            required 
            autoComplete="current-password"
            onChange={e => setCreds({...creds, password: e.target.value})} 
          />
          
          <Button 
            variant="primary" 
            type="submit" 
            className="w-100 py-3 fw-bold rounded-pill shadow mt-3 border-0 text-white" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                MENGHUBUNGKAN...
              </>
            ) : 'MASUK KE DASHBOARD'}
          </Button>
        </Form>
        
        <p className="mt-4 text-muted small">
          &copy; {new Date().getFullYear()} Mine-Panel Team
        </p>
      </Card>
    </Container>
  );
};

export default LoginView;