import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, ArrowLeft, Plus, X, CalendarDays } from 'lucide-react';

import { api, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import { Loader } from '../components/ui.jsx';
import { localize } from '../lib/format.js';

const PRICE_TYPES = ['hour', 'day', 'event', 'person', 'set'];
const CITIES = ['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan', 'Xorazm', 'Qarshi', 'Nukus', 'Jizzax'];

const EMPTY = {
  name: '',
  description: '',
  category_id: '',
  price: '',
  price_type: 'day',
  deposit: 0,
  city: 'Toshkent',
  district: '',
  address: '',
  quantity: 1,
  min_order: 1,
  unit_note: '',
  available: true,
  images: [],
};

export default function AddProduct() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [blocked, setBlocked] = useState([]);
  const [dateInput, setDateInput] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.items || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/products/${id}`)
      .then((product) => {
        setForm({
          name: product.name || '',
          description: product.description || '',
          category_id: product.category_id || '',
          price: product.price || '',
          price_type: product.price_type || 'day',
          deposit: product.deposit || 0,
          city: product.city || 'Toshkent',
          district: product.district || '',
          address: product.address || '',
          quantity: product.quantity || 1,
          min_order: product.min_order || 1,
          unit_note: product.unit_note || '',
          available: product.available !== false,
          images: product.images || [],
        });
        setBlocked((product.availability || []).filter((a) => a.status !== 'available').map((a) => a.date));
      })
      .catch(() => toast.error(t('errors.somethingWrong')))
      .finally(() => setLoading(false));
  }, [id, isEdit, t, toast]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.category_id || !form.price || !form.city) {
      toast.error(t('auth.requiredFields'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        deposit: Number(form.deposit) || 0,
        quantity: Number(form.quantity) || 1,
        min_order: Number(form.min_order) || 1,
        category_id: Number(form.category_id),
        blocked_dates: blocked,
      };
      if (isEdit) await api.put(`/products/${id}`, payload);
      else await api.post('/products', payload);
      toast.success(isEdit ? t('common.success') : t('common.success'));
      navigate('/seller');
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate(-1)} className="soft-btn-ghost mb-2 !px-0">
        <ArrowLeft size={15} /> {t('seller.dashboard')}
      </button>

      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        {isEdit ? t('seller.editProduct') : t('seller.addProduct')}
      </h1>

      <form onSubmit={submit} className="space-y-5">
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('common.description')}</h2>
          <div className="space-y-4">
            <div>
              <label className="soft-label">{t('admin.nameUz')} / nomi *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className="soft-input" placeholder="Masalan: Banket stoli (10 kishilik)" />
            </div>
            <div>
              <label className="soft-label">{t('common.description')}</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="soft-input resize-none"
                placeholder="Jihoz holati, komplektatsiya, qo‘shimcha shartlar..."
              />
            </div>
            <div>
              <label className="soft-label">{t('common.category')} *</label>
              <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className="soft-input">
                <option value="">—</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{localize(category, 'name', i18n.language)}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('common.price')}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="soft-label">{t('common.price')} (so'm) *</label>
              <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} className="soft-input" />
            </div>
            <div>
              <label className="soft-label">{t('product.calcTotal')}</label>
              <select value={form.price_type} onChange={(e) => set('price_type', e.target.value)} className="soft-input">
                {PRICE_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`common.per${type.charAt(0).toUpperCase()}${type.slice(1)}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="soft-label">{t('product.deposit')}</label>
              <input type="number" min="0" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} className="soft-input" />
            </div>
            <div className="sm:col-span-3">
              <label className="soft-label">{t('product.unitNote')}</label>
              <input value={form.unit_note} onChange={(e) => set('unit_note', e.target.value)} className="soft-input" placeholder="Masalan: 1 dona / kun" />
            </div>
          </div>
        </section>

        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('common.address')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soft-label">{t('common.city')} *</label>
              <select value={form.city} onChange={(e) => set('city', e.target.value)} className="soft-input">
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div>
              <label className="soft-label">{t('checkout.district')}</label>
              <input value={form.district} onChange={(e) => set('district', e.target.value)} className="soft-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="soft-label">{t('common.address')}</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} className="soft-input" />
            </div>
          </div>
        </section>

        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('product.inStock')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soft-label">{t('common.quantity')}</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="soft-input" />
            </div>
            <div>
              <label className="soft-label">{t('product.minOrder')}</label>
              <input type="number" min="1" value={form.min_order} onChange={(e) => set('min_order', e.target.value)} className="soft-input" />
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => set('available', e.target.checked)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            <span className="font-semibold">{t('common.available')}</span>
          </label>
        </section>

        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('auth.avatar')} / rasmlar</h2>
          <ImageUploader value={form.images} onChange={(images) => set('images', images)} />
        </section>

        <section className="soft p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-extrabold">
            <CalendarDays size={15} /> {t('product.blockedDates')}
          </h2>
          <p className="mb-4 text-xs text-muted">{t('explore.dateHint')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="soft-input !py-2.5"
            />
            <button
              type="button"
              onClick={() => {
                if (dateInput && !blocked.includes(dateInput)) setBlocked([...blocked, dateInput].sort());
                setDateInput('');
              }}
              className="soft-btn !py-2.5 !text-xs whitespace-nowrap"
            >
              <Plus size={14} /> {t('common.add')}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {blocked.map((date) => (
              <span key={date} className="soft-chip !text-[11px]">
                {date}
                <button type="button" onClick={() => setBlocked(blocked.filter((d) => d !== date))} aria-label={t('common.remove')}>
                  <X size={11} />
                </button>
              </span>
            ))}
            {!blocked.length && <span className="text-xs text-muted">—</span>}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={saving} className="soft-btn-primary flex-1">
            <Save size={16} /> {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" onClick={() => navigate('/seller')} className="soft-btn flex-1">
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
