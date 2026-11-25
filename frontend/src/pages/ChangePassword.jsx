import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, AlertTriangle } from 'lucide-react';
import { authApi, getStoredUser, setStoredUser } from '../services/api';

const ChangePassword = () => {
  const [authStatus, setAuthStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setAuthStatus('changing');
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const data = await authApi.changePassword(form.currentPassword, form.newPassword);
      const storedUser = getStoredUser();
      if (storedUser) {
        setStoredUser({ ...storedUser, mustChangePassword: false });
      }
      setAuthStatus('success');
      setSuccessMessage(data.message || 'Password changed successfully.');
      setTimeout(() => navigate('/landing', { replace: true }), 1200);
    } catch (err) {
      setAuthStatus('error');
      setErrorMessage(err.message || 'Failed to change password.');
    }
  };

  const input = (type, name, value, show, toggleShow, label) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} name={name} value={value} onChange={onChange} placeholder='&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;' disabled={authStatus === 'changing'} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} />
        <button type='button' onClick={toggleShow} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', fontSize: '12px' }} disabled={authStatus === 'changing'}>{show ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020204' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '40px 32px', width: '100%', maxWidth: '400px', backdropFilter: 'blur(12px)', color: '#fff', fontFamily: '"JetBrains Mono", "Courier New", monospace' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Lock size={24} color='#00e5ff' />
          <h1 style={{ fontSize: '16px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, color: '#fff' }}>Change Password</h1>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(0,229,255,0.7)', marginBottom: '24px', lineHeight: '1.6' }}>You are required to change your password before accessing CHAIN55.</p>
        {errorMessage && (
          <div style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid rgba(255,0,85,0.4)', color: '#ff6b8b', padding: '10px 14px', borderRadius: '6px', fontSize: '11px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /><span>{errorMessage}</span>
          </div>
        )}
        {successMessage && authStatus === 'success' && (
          <div style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff', padding: '10px 14px', borderRadius: '6px', fontSize: '11px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /><span>{successMessage}</span>
          </div>
        )}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {input('password', 'currentPassword', form.currentPassword, showCurrent, () => setShowCurrent(!showCurrent), 'Current Password')}
          {input('password', 'newPassword', form.newPassword, showNew, () => setShowNew(!showNew), 'New Password')}
          <button type='submit' disabled={authStatus === 'changing'} className='login-btn' style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: authStatus === 'changing' ? 'rgba(0,229,255,0.3)' : '#00e5ff', color: '#020306', fontSize: '11px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', cursor: authStatus === 'changing' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{authStatus === 'changing' ? 'CHANGING...' : 'CHANGE PASSWORD'}</button>
        </form>
        <p style={{ marginTop: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>CHAIN55 Consensus Engine — Secure Access</p>
      </div>
    </div>
  );
};

export default ChangePassword;
