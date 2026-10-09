import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'eventbox_cart';

/** Mirrors the server pricing rule so the cart preview matches the final order. */
export function lineTotal(item, guests = 0) {
  const qty = Math.max(1, Number(item.quantity) || 1);
  const units = Math.max(1, Number(item.units) || 1);
  if (item.price_type === 'person') return item.price * Math.max(1, Number(guests) || qty);
  if (item.price_type === 'event' || item.price_type === 'set') return item.price * qty;
  return item.price * qty * units;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      items: Array.isArray(raw.items) ? raw.items : [],
      config: {
        deliveryOptionId: raw.config?.deliveryOptionId ?? 1,
        needInstallation: !!raw.config?.needInstallation,
        distanceKm: Number(raw.config?.distanceKm) || 10,
        eventDate: raw.config?.eventDate || '',
        eventType: raw.config?.eventType || 'wedding',
        guests: Number(raw.config?.guests) || 100,
        city: raw.config?.city || '',
      },
    };
  } catch {
    return { items: [], config: {} };
  }
}

export function CartProvider({ children }) {
  const initial = load();
  const [items, setItems] = useState(initial.items);
  const [config, setConfig] = useState(initial.config);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, config }));
    } catch {
      /* ignore */
    }
  }, [items, config]);

  const add = useCallback((product, quantity = 1, units = 1) => {
    if (!product?.id) return;
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + quantity, units: i.units || units } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          price_type: product.price_type,
          image: product.images?.[0] || product.image || null,
          city: product.city,
          min_order: product.min_order || 1,
          unit_note: product.unit_note || '',
          seller_id: product.seller_id || product.seller?.id,
          seller_name: product.seller?.name || product.seller_name || '',
          seller_slug: product.seller?.slug || product.seller_slug || '',
          quantity: Math.max(quantity, product.min_order || 1),
          units: product.price_type === 'hour' || product.price_type === 'day' ? units : 1,
        },
      ];
    });
  }, []);

  const addMany = useCallback((products) => {
    products.forEach((p) => add(p, p.quantity || p.suggested_quantity || 1, p.units || 1));
  }, [add]);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const setQty = useCallback((id, quantity) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Number(quantity) || 1) } : i)));
  }, []);
  const setUnits = useCallback((id, units) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, units: Math.max(1, Number(units) || 1) } : i)));
  }, []);
  const clear = useCallback(() => {
    setItems([]);
    setConfig((c) => ({ ...c }));
  }, []);
  const updateConfig = useCallback((patch) => setConfig((prev) => ({ ...prev, ...patch })), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + lineTotal(i, config.guests), 0);
  const sellers = useMemo(() => [...new Set(items.map((i) => i.seller_id).filter(Boolean))], [items]);

  const value = useMemo(
    () => ({
      items,
      config,
      count,
      subtotal,
      sellers,
      add,
      addMany,
      remove,
      setQty,
      setUnits,
      clear,
      updateConfig,
      has: (id) => items.some((i) => i.id === id),
    }),
    [items, config, count, subtotal, sellers, add, addMany, remove, setQty, setUnits, clear, updateConfig]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
