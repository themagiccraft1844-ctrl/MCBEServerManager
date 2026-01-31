import React from 'react';
import { Badge, Button, Form, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { Activity, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

/**
 * Komponen Badge untuk status server
 */
export const StatusBadge = ({ status, isLoading }) => {
  if (isLoading) return <Badge bg="info" className="animate-pulse px-3 rounded-pill">MEMPROSES...</Badge>;
  return (
    <Badge bg={status === 'running' ? 'success' : 'secondary'} className="rounded-pill px-3">
      {status ? status.toUpperCase() : 'OFFLINE'}
    </Badge>
  );
};

/**
 * Komponen Tombol Aksi yang mendukung loading spinner
 */
export const ActionButton = ({ variant, icon: Icon, label, onClick, loading, disabled, className }) => (
  <Button 
    variant={variant} 
    className={`d-flex align-items-center justify-content-center gap-2 ${className}`}
    onClick={onClick}
    disabled={loading || disabled}
  >
    {loading ? <Spinner animation="border" size="sm" /> : <><Icon size={18} /> {label}</>}
  </Button>
);

/**
 * Komponen Input Form yang seragam
 */
export const FormField = ({ label, icon: Icon, ...props }) => (
  <Form.Group className="mb-3 text-start">
    <Form.Label className="small fw-bold text-muted d-flex align-items-center gap-1">
      {Icon && <Icon size={14} className="text-primary" />} {label}
    </Form.Label>
    <Form.Control {...props} className="rounded-3 shadow-sm border-0 bg-light p-2" />
  </Form.Group>
);

/**
 * Komponen Notifikasi Toast
 */
export const CustomToast = ({ show, onClose, message, variant }) => {
  const Icon = variant === 'success' ? CheckCircle : variant === 'danger' ? XCircle : variant === 'info' ? Info : AlertCircle;
  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      <Toast onClose={onClose} show={show} delay={3000} autohide bg={variant}>
        <Toast.Body className="text-white fw-bold d-flex align-items-center gap-2">
          <Icon size={16} /> {message}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
};