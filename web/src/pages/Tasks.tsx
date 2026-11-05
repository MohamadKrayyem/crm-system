import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import api, { errorMessage } from '../api';

type Task = { id: number; title: string; dueDate: string; done: boolean; userName: string };

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const isAdmin = localStorage.getItem('role') === 'Admin';
  // en-CA formats as YYYY-MM-DD in the browser's local time
  const today = new Date().toLocaleDateString('en-CA');

  async function load() {
    try {
      const { data } = await api.get('/tasks');
      setTasks(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tasks', { title, dueDate });
      setTitle('');
      setDueDate('');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function toggle(task: Task) {
    setError('');
    try {
      await api.put(`/tasks/${task.id}/done`, { done: !task.done });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <h1>Tasks</h1>
      {error && <p className="error">{error}</p>}
      <form className="card task-form" onSubmit={addTask}>
        <input aria-label="Task title" placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input aria-label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        <button className="primary">
          <Plus size={16} /> Add Task
        </button>
      </form>
      <ul className="card tasks">
        {tasks.map((t) => {
          const due = t.dueDate.slice(0, 10);
          return (
            <li key={t.id} className={t.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
                <span>{t.title}</span>
              </label>
              {!t.done && due < today && <span className="overdue">Overdue</span>}
              {isAdmin && <small>{t.userName}</small>}
              <small>{due}</small>
            </li>
          );
        })}
      </ul>
    </>
  );
}
