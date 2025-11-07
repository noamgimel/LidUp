import React from "react";

export default function GoogleAuthSuccess() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const success = params.get('success');

  // הוספת לוג כדי לוודא שהגענו לכאן
  console.log("🎯 GoogleAuthSuccess page loaded:", { error, success });

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'Heebo, -apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    padding: '20px',
    direction: 'rtl'
  };

  const iconStyle = {
    width: '64px',
    height: '64px',
    marginBottom: '20px'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: error ? '#dc3545' : '#28a745'
  };

  const messageStyle = {
    fontSize: '16px',
    color: '#6c757d',
    marginBottom: '20px'
  };

  const instructionStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#495057'
  };

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{...iconStyle, color: '#dc3545'}}>❌</div>
        <h1 style={titleStyle}>שגיאה באימות</h1>
        <p style={messageStyle}>שגיאה: {error}</p>
        <p style={instructionStyle}>ניתן לסגור את החלון ולנסות שוב.</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{...iconStyle, color: '#28a745'}}>✅</div>
      <h1 style={titleStyle}>החיבור הצליח!</h1>
      <p style={messageStyle}>יומן Google שלך חובר בהצלחה למערכת.</p>
      <p style={instructionStyle}>ניתן לסגור את החלון ולחזור לאפליקציה.</p>
    </div>
  );
}