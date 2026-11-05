import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import api, { errorMessage } from '../api';
import { Modal } from '../App';

type Deal = { id: number; title: string; value: number; stage: string; company: string; ownerName: string; createdAt: string };
type Activity = { id: number; type: string; note: string; userName: string; createdAt: string };
type Customer = { id: number; company: string };

const stages = ['LEAD', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const activityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
const emptyDeal = { title: '', value: '', customerId: '' };
const emptyActivity = { type: 'CALL', note: '' };

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newDeal, setNewDeal] = useState<typeof emptyDeal | null>(null);
  const [selected, setSelected] = useState<{ deal: Deal; activities: Activity[] } | null>(null);
  const [activity, setActivity] = useState(emptyActivity);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/deals');
      setDeals(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
    api.get('/customers').then((res) => setCustomers(res.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  async function moveDeal(id: number, stage: string) {
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;
    setError('');
    setDeals(deals.map((d) => (d.id === id ? { ...d, stage } : d)));
    try {
      await api.put(`/deals/${id}/stage`, { stage });
    } catch (err) {
      setError(errorMessage(err));
      load();
    }
  }

  async function saveDeal(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/deals', { ...newDeal, value: Number(newDeal!.value), customerId: Number(newDeal!.customerId) });
      setNewDeal(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function openDeal(id: number) {
    setError('');
    try {
      const { data } = await api.get(`/deals/${id}`);
      setSelected(data);
      setActivity(emptyActivity);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveActivity(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/deals/${selected!.deal.id}/activities`, activity);
      openDeal(selected!.deal.id);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Deals</h1>
        <button className="primary" onClick={() => { setError(''); setNewDeal(emptyDeal); }}>
          <Plus size={16} /> New Deal
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="board">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div
              className="column"
              key={stage}
              data-stage={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => moveDeal(Number(e.dataTransfer.getData('text/plain')), stage)}
            >
              <h3>{stage} ({stageDeals.length})</h3>
              {stageDeals.map((d) => (
                <div
                  className="card deal"
                  key={d.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(d.id))}
                  onClick={() => openDeal(d.id)}
                >
                  <strong>{d.title}</strong>
                  <span>{d.company}</span>
                  <span className="deal-value">${d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {newDeal && (
        <Modal title="New Deal" onClose={() => setNewDeal(null)}>
          <form onSubmit={saveDeal}>
            <label>
              Title
              <input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} required />
            </label>
            <label>
              Value
              <input type="number" min="0" step="0.01" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })} required />
            </label>
            <label>
              Customer
              <select value={newDeal.customerId} onChange={(e) => setNewDeal({ ...newDeal, customerId: e.target.value })} required>
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.company}</option>
                ))}
              </select>
            </label>
            <button className="primary">Save</button>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal title={selected.deal.title} onClose={() => setSelected(null)}>
          <dl className="details">
            <dt>Customer</dt><dd>{selected.deal.company}</dd>
            <dt>Value</dt><dd>${selected.deal.value.toLocaleString()}</dd>
            <dt>Stage</dt><dd>{selected.deal.stage}</dd>
            <dt>Owner</dt><dd>{selected.deal.ownerName}</dd>
            <dt>Created</dt><dd>{new Date(selected.deal.createdAt).toLocaleDateString()}</dd>
          </dl>
          <h3>Activities</h3>
          <form className="activity-form" onSubmit={saveActivity}>
            <select aria-label="Activity type" value={activity.type} onChange={(e) => setActivity({ ...activity, type: e.target.value })}>
              {activityTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input aria-label="Activity note" placeholder="Note" value={activity.note} onChange={(e) => setActivity({ ...activity, note: e.target.value })} required />
            <button className="primary">Add</button>
          </form>
          <ul className="activities">
            {selected.activities.map((a) => (
              <li key={a.id}>
                <strong>{a.type}</strong> {a.note}
                <small>{a.userName}, {new Date(a.createdAt).toLocaleString()}</small>
              </li>
            ))}
            {selected.activities.length === 0 && <li>No activities yet.</li>}
          </ul>
        </Modal>
      )}
    </>
  );
}
