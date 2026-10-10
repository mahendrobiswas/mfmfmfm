'use client';

import React, { useState, useEffect } from 'react';

export default function VerifyPage() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUserId(params.get('uid') || '');
    setTimestamp(params.get('t') || '');
    setSignature(params.get('sig') || '');
  }, []);

  // ব্রাউজার/ডিভাইস ফিঙ্গারপ্রিন্ট তৈরি
  const getDeviceHash = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('GLORY-VERIFY-CANVAS', 2, 15);
      }
      const canvasData = canvas.toDataURL();

      // WebGL Renderer তথ্য
      let glRenderer = '';
      try {
        const gl = canvas.getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e) {}

      const rawString = [
        canvasData,
        glRenderer,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        navigator.hardwareConcurrency || 'unknown',
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ].join('###');

      // SHA-256 Hash
      const encoder = new TextEncoder();
      const data = encoder.encode(rawString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', hashBufferToBytes(data));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'fallback-' + Math.random().toString(36);
    }
  };

  function hashBufferToBytes(data: Uint8Array) {
    return data.buffer;
  }

  const handleVerify = async () => {
    if (!userId || !timestamp || !signature) {
      setStatus('error');
      setMessage('অসম্পূর্ণ লিংক! দয়া করে টেলিগ্রাম বটের মাধ্যমে আবার চেষ্টা করুন।');
      return;
    }

    setStatus('scanning');
    setMessage('ডিভাইস হার্ডওয়্যার তথ্য স্ক্যান করা হচ্ছে...');

    try {
      const deviceHash = await getDeviceHash();

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, timestamp, signature, deviceHash })
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'ভেরিফিকেশন ব্যর্থ হয়েছে!');
      }
    } catch {
      setStatus('error');
      setMessage('সার্ভারে যোগাযোগ করা যায়নি। আবার চেষ্টা করুন।');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '420px', width: '100%', background: '#121824', borderRadius: '16px', padding: '30px', border: '1px solid #1f293d', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>টেলিগ্রাম ডিভাইস সিকিউরিটি</h2>
        <p style={{ fontSize: '14px', color: '#8892b0', marginBottom: '24px' }}>
          বট অ্যাক্সেস পেতে আপনার ডিভাইসটি ভেরিফাই করুন। একটি ডিভাইস থেকে শুধুমাত্র একটি একাউন্ট অনুমোদিত।
        </p>

        {userId && (
          <div style={{ background: '#1a2234', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#64ffda', marginBottom: '20px' }}>
            ইউজার আইডি: <strong>{userId}</strong>
          </div>
        )}

        {status === 'idle' && (
          <button
            onClick={handleVerify}
            style={{ width: '100%', padding: '14px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ডিভাইস ভেরিফাই করুন
          </button>
        )}

        {status === 'scanning' && (
          <div style={{ color: '#fbbf24', fontSize: '15px' }}>
            ⏳ {message}
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px', marginBottom: '16px' }}>
              ✅ {message}
            </div>
            <a
              href="tg://resolve"
              style={{ display: 'inline-block', width: '100%', padding: '12px', background: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: 'bold' }}
            >
              টেলিগ্রাম বটে ফিরে যান
            </a>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ color: '#ef4444', background: '#3b1219', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
              {message}
            </div>
            <button
              onClick={handleVerify}
              style={{ width: '100%', padding: '12px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
