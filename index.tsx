import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

const ML_PER_OZ = 29.5735;
const mlToOz = (ml) => (ml / ML_PER_OZ).toFixed(1);
const ozToMl = (oz) => oz * ML_PER_OZ;

const DRINK_CAFFEINE_MAP = {
  coffee: 95,    // per 240ml (8oz)
  tea: 47,       // per 240ml (8oz)
  soda: 22,      // per 240ml (8oz)
  espresso: 64,  // per 30ml (1oz)
};

const getEstimatedCaffeine = (type, sizeMl) => {
  if (!DRINK_CAFFEINE_MAP[type]) return 0;

  const baseAmount = DRINK_CAFFEINE_MAP[type];
  const baseVolume = type === 'espresso' ? 30 : 240;
  
  return Math.round((sizeMl / baseVolume) * baseAmount);
};

const LogDrinkModal = ({ onClose, onLog, unit }) => {
  const [drinkType, setDrinkType] = useState('coffee');
  const [size, setSize] = useState(unit === 'ml' ? '240' : '8');

  const handleSubmit = (e) => {
    e.preventDefault();
    const sizeValue = parseFloat(size);
    let sizeMl = sizeValue;

    if (unit === 'fl oz') {
      sizeMl = ozToMl(sizeValue);
    }
    
    if (sizeMl > 0) {
      onLog({
        id: Date.now(),
        drink: drinkType,
        size: Math.round(sizeMl),
        caffeine: getEstimatedCaffeine(drinkType, sizeMl),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Log a Drink</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="drinkType">Drink Type</label>
            <select id="drinkType" value={drinkType} onChange={(e) => setDrinkType(e.target.value)}>
              <option value="coffee">Coffee</option>
              <option value="espresso">Espresso</option>
              <option value="tea">Tea</option>
              <option value="soda">Soda</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="size">Size ({unit})</label>
            <input
              id="size"
              type="number"
              step={unit === 'fl oz' ? '0.1' : '1'}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder={unit === 'ml' ? 'e.g., 240' : 'e.g., 8'}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Log Drink</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SetGoalModal = ({ onClose, onSave, currentGoal }) => {
    const [goal, setGoal] = useState(currentGoal || '');

    const handleSave = () => {
        const goalValue = parseInt(goal, 10);
        if (goalValue > 0) {
            onSave(goalValue);
        } else {
            onSave(null); // Clear goal if invalid or zero
        }
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Set Daily Goal</h3>
                <div className="form-group">
                    <label htmlFor="goal">Max Caffeine (mg)</label>
                    <input
                        id="goal"
                        type="number"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., 200"
                    />
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
  const [logs, setLogs] = useState([]);
  const [goal, setGoal] = useState(null);
  const [unit, setUnit] = useState('ml');
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isGoalModalOpen, setGoalModalOpen] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
          console.log('ServiceWorker registration failed: ', err);
        });
      });
    }
  }, []);

  useEffect(() => {
    const savedLogs = localStorage.getItem('caffeineLogs');
    const savedGoal = localStorage.getItem('caffeineGoal');
    const savedUnit = localStorage.getItem('caffeineUnit');
    const today = new Date().toLocaleDateString();

    if (savedLogs) {
        const { date, logs: dailyLogs } = JSON.parse(savedLogs);
        if (date === today) {
            setLogs(dailyLogs);
        } else {
            localStorage.removeItem('caffeineLogs'); // Clear logs for new day
        }
    }
    if (savedGoal) {
        setGoal(JSON.parse(savedGoal));
    }
    if (savedUnit) {
        setUnit(savedUnit);
    }
  }, []);

  useEffect(() => {
    const today = new Date().toLocaleDateString();
    localStorage.setItem('caffeineLogs', JSON.stringify({ date: today, logs }));
  }, [logs]);

  useEffect(() => {
    if (goal !== null) {
        localStorage.setItem('caffeineGoal', JSON.stringify(goal));
    } else {
        localStorage.removeItem('caffeineGoal');
    }
  }, [goal]);

  useEffect(() => {
    localStorage.setItem('caffeineUnit', unit);
  }, [unit]);

  const totalCaffeine = useMemo(() => {
    return logs.reduce((sum, log) => sum + log.caffeine, 0);
  }, [logs]);

  const handleLogDrink = (newLog) => {
    setLogs([...logs, newLog]);
  };
  
  const isOverLimit = goal !== null && totalCaffeine > goal;

  return (
    <div className="app-container">
      {isLogModalOpen && <LogDrinkModal onClose={() => setLogModalOpen(false)} onLog={handleLogDrink} unit={unit} />}
      {isGoalModalOpen && <SetGoalModal onClose={() => setGoalModalOpen(false)} onSave={setGoal} currentGoal={goal} />}

      <header className="card summary-card">
        <div className="unit-toggle">
            <button onClick={() => setUnit('ml')} className={unit === 'ml' ? 'active' : ''}>ml</button>
            <button onClick={() => setUnit('fl oz')} className={unit === 'fl oz' ? 'active' : ''}>fl oz</button>
        </div>
        <h2>Total Estimated Caffeine</h2>
        <div className={`total-caffeine ${isOverLimit ? 'over-limit' : ''}`}>
          {totalCaffeine} mg
        </div>
        <div className="goal-section">
          {goal ? `Goal: ${goal} mg` : 'No goal set.'}
          <button onClick={() => setGoalModalOpen(true)}>
            {goal ? 'Edit Goal' : 'Set Daily Goal'}
          </button>
        </div>
      </header>

      <main className="card log-list">
        <h3>Today's Log</h3>
        {logs.length > 0 ? (
          logs.map(log => (
            <div key={log.id} className="log-item">
              <div className="log-item-details">
                <span className="drink-name">{log.drink.charAt(0).toUpperCase() + log.drink.slice(1)}</span>
                <span className="drink-size">
                    {unit === 'ml' ? `${log.size}ml` : `${mlToOz(log.size)} fl oz`} at {log.time}
                </span>
              </div>
              <div className="log-item-caffeine">{log.caffeine} mg</div>
            </div>
          ))
        ) : (
          <div className="empty-log">No drinks logged yet.</div>
        )}
      </main>

      <button className="fab-button" onClick={() => setLogModalOpen(true)} aria-label="Log new drink">+</button>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);