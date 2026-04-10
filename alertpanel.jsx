  import React, { useState, useEffect } from 'react';

  var alertData = [
    { id: 1, level: 'critical', title: 'Cyclone Alert', message: 'IMD issues red warning for coastal Tamil Nadu. Wind speeds up to 120 km/h expected. Seek shelter immediately.', time: '2 min ago' },
    { id: 2, level: 'high',     title: 'Flood Warning',  message: 'Adyar river level crossing danger mark. Downstream areas must evacuate now.', time: '8 min ago' },
    { id: 3, level: 'medium',   title: 'Power Outage',   message: 'Outage reported in Velachery, Guindy, and Saidapet zones. Estimated restore time: 4 hours.', time: '15 min ago' },
    { id: 4, level: 'low',      title: 'Road Closure',   message: 'Mount Road near LIC building closed for emergency drainage work until 6 PM.', time: '30 min ago' }
  ];

  var levelColors = {
    critical: '#cc0000',
    high:     '#e07000',
    medium:   '#b38600',
    low:      '#1a6eb5'
  };

  function AlertCard(props) {
    var alert = props.alert;
    var onDismiss = props.onDismiss;
    var color = levelColors[alert.level] || '#333';

    return (
      <div style={{
        border: '1px solid ' + color,
        borderLeft: '4px solid ' + color,
        borderRadius: '4px',
        padding: '14px',
        marginBottom: '10px',
        background: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '2px 8px',
              border: '1px solid ' + color,
              color: color,
              borderRadius: '3px',
              textTransform: 'uppercase'
            }}>
              {alert.level}
            </span>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{alert.title}</span>
          </div>
          <button
            onClick={function() { onDismiss(alert.id); }}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '16px' }}
          >
            x
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', marginBottom: '6px' }}>
          {alert.message}
        </p>

        <span style={{ fontSize: '11px', color: '#999' }}>{alert.time}</span>
      </div>
    );
  }

  function StatsBar(props) {
    var counts = props.counts;
    var levels = ['critical', 'high', 'medium', 'low'];

    return (
      <div style={{ display: 'flex', gap: '1px', marginBottom: '20px', background: '#eee', border: '1px solid #ddd' }}>
        {levels.map(function(level) {
          return (
            <div key={level} style={{ flex: 1, background: '#fff', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: levelColors[level] }}>
                {counts[level]}
              </div>
              <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {level}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  export default function AlertPanel() {
    var initialAlerts = alertData;
    var alertState = useState(initialAlerts);
    var alerts = alertState[0];
    var setAlerts = alertState[1];

    var filterState = useState('all');
    var filter = filterState[0];
    var setFilter = filterState[1];

    var inputState = useState('');
    var inputText = inputState[0];
    var setInputText = inputState[1];

    var levelState = useState('medium');
    var newLevel = levelState[0];
    var setNewLevel = levelState[1];

    var timeState = useState(new Date().toLocaleTimeString());
    var liveTime = timeState[0];
    var setLiveTime = timeState[1];

    useEffect(function() {
      var timer = setInterval(function() {
        setLiveTime(new Date().toLocaleTimeString());
      }, 1000);
      return function() {
        clearInterval(timer);
      };
    }, []);

    function dismissAlert(id) {
      setAlerts(function(prev) {
        return prev.filter(function(a) { return a.id !== id; });
      });
    }

    function addAlert() {
      if (!inputText.trim()) return;
      var newAlert = {
        id: Date.now(),
        level: newLevel,
        title: 'Community Report',
        message: inputText.trim(),
        time: 'Just now'
      };
      setAlerts(function(prev) { return [newAlert].concat(prev); });
      setInputText('');
    }

    var counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (var i = 0; i < alerts.length; i++) {
      var lvl = alerts[i].level;
      if (counts[lvl] !== undefined) counts[lvl]++;
    }

    var filtered = filter === 'all' ? alerts : alerts.filter(function(a) { return a.level === filter; });
    var levels = ['all', 'critical', 'high', 'medium', 'low'];

    return (
      <div style={{ background: '#f4f6f8', padding: '28px', maxWidth: '640px', fontFamily: 'Poppins, sans-serif' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>Alert Panel</h2>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Live — {liveTime}</p>
          </div>
          <span style={{
            background: '#e0f5f2', color: '#1a7a6e', padding: '6px 14px',
            borderRadius: '20px', fontSize: '12px', fontWeight: '600'
          }}>
            {alerts.length} Active
          </span>
        </div>

        <StatsBar counts={counts} />

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Post a Community Alert
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={newLevel}
              onChange={function(e) { setNewLevel(e.target.value); }}
              style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="text"
              value={inputText}
              onChange={function(e) { setInputText(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter') addAlert(); }}
              placeholder="Describe the situation..."
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}
            />
            <button
              onClick={addAlert}
              style={{
                background: '#cc0000', color: '#fff', border: 'none',
                padding: '8px 18px', borderRadius: '4px', cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif', fontWeight: '600', fontSize: '13px'
              }}
            >
              Post
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {levels.map(function(f) {
            var isActive = filter === f;
            return (
              <button
                key={f}
                onClick={function() { setFilter(f); }}
                style={{
                  background: isActive ? '#1a1a2e' : '#fff',
                  color: isActive ? '#fff' : '#666',
                  border: '1px solid ' + (isActive ? '#1a1a2e' : '#ccc'),
                  padding: '5px 14px', borderRadius: '20px',
                  fontFamily: 'Poppins, sans-serif', fontSize: '12px',
                  cursor: 'pointer', textTransform: 'capitalize'
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        <div>
          {filtered.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              No active alerts for this level.
            </p>
          ) : (
            filtered.map(function(alert) {
              return <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />;
            })
          )}
        </div>
      </div>
    );
  }