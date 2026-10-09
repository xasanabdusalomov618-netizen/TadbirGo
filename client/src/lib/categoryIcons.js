import {
  Table2, Tent, Sparkles, Camera, Speaker, Projector, Lightbulb, Utensils, Disc3,
  Video, ChefHat, Building2, Truck, Wrench, Package,
} from 'lucide-react';

export const CATEGORY_ICONS = {
  'stol-va-stullar': Table2,
  chodirlar: Tent,
  dekor: Sparkles,
  fotozona: Camera,
  'kolonka-va-audio': Speaker,
  projektor: Projector,
  yoruglik: Lightbulb,
  'idish-tovoqlar': Utensils,
  dj: Disc3,
  fotograf: Camera,
  videograf: Video,
  catering: ChefHat,
  'event-joylari': Building2,
  'yetkazib-berish': Truck,
  ornatish: Wrench,
};

export function categoryIcon(slug) {
  return CATEGORY_ICONS[slug] || Package;
}

export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'graduation', 'other'];

export function eventTypeLabel(t, type) {
  return t(`package.${type}`, type);
}
