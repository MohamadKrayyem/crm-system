import { useEffect, useState } from 'react';
import { Briefcase, CalendarCheck, Trophy, Users } from 'lucide-react';
import api, { errorMessage } from '../api';

export default function Dashboard() {
  const [data, setData] = useState({ openValue: 0, wonValue: 0, customers: 0, tasksDueToday: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const cards = [
    { label: 'Open deals value', value: `$${data.openValue.toLocaleString()}`, icon: Briefcase },
    { label: 'Won value', value: `$${data.wonValue.toLocaleString()}`, icon: Trophy },
    { label: 'Customers', value: data.customers, icon: Users },
    { label: 'Tasks due today', value: data.tasksDueToday, icon: CalendarCheck },
  ];

  return (
    <>
      <h1>Dashboard</h1>
      {error && <p className="error">{error}</p>}
      <div className="cards">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="card stat" key={label}>
            <Icon size={24} />
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
