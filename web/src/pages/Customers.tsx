import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api';
import { Modal } from '../App';

type Customer = { id: number; company: string; contactName: string; email: string; phone: string; city: string };

const emptyCustomer: Customer = { id: 0, company: '', contactName: '', email: '', phone: '', city: '' };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const isAdmin = localStorage.getItem('role') === 'Admin';

  async function load() {
    try {
      const { data } = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (form!.id) await api.put(`/customers/${form!.id}`, form);
      else await api.post('/customers', form);
      setForm(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(customer: Customer) {
    if (!confirm(`Delete ${customer.company}?`)) return;
    setError('');
    try {
      await api.delete(`/customers/${customer.id}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const term = search.toLowerCase();
  const filtered = customers.filter((c) =>
    [c.company, c.contactName, c.email, c.phone, c.city].some((value) => value?.toLowerCase().includes(term))
  );

  return (
    <>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="primary" onClick={() => { setError(''); setForm(emptyCustomer); }}>
          <Plus size={16} /> New Customer
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <input className="search" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.company}</td>
                <td>{c.contactName}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.city}</td>
                <td className="actions">
                  <button className="icon-button" aria-label={`Edit ${c.company}`} onClick={() => { setError(''); setForm(c); }}>
                    <Pencil size={16} />
                  </button>
                  {isAdmin && (
                    <button className="icon-button" aria-label={`Delete ${c.company}`} onClick={() => remove(c)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? 'Edit Customer' : 'New Customer'} onClose={() => setForm(null)}>
          <form onSubmit={save}>
            <label>
              Company
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
            </label>
            <label>
              Contact name
              <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Phone
              <input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              City
              <input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <button className="primary">Save</button>
          </form>
        </Modal>
      )}
    </>
  );
}
