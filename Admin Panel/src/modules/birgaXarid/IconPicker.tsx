import { useMemo, useState } from 'react'
import { icons, Search, type LucideIcon } from 'lucide-react'

const EXCLUDED = new Set(['createLucideIcon', 'default', 'icons', 'Icon'])

export const BIRGA_ICON_NAMES = Object.keys(icons)
  .filter((name) => {
    if (EXCLUDED.has(name)) return false
    if (name.endsWith('Icon')) return false
    const Comp = icons[name as keyof typeof icons]
    return typeof Comp === 'function' || (typeof Comp === 'object' && Comp !== null)
  })
  .sort((a, b) => a.localeCompare(b))

const POPULAR = [
  'Package',
  'ShoppingBag',
  'ShoppingBasket',
  'Store',
  'Apple',
  'Carrot',
  'Cherry',
  'Grape',
  'Banana',
  'Citrus',
  'Milk',
  'Beef',
  'Fish',
  'Egg',
  'Wheat',
  'Coffee',
  'CupSoda',
  'Wine',
  'IceCreamCone',
  'Cake',
  'Cookie',
  'Pizza',
  'Sandwich',
  'Soup',
  'Salad',
  'Utensils',
  'UtensilsCrossed',
  'Home',
  'Sofa',
  'BedDouble',
  'Lamp',
  'Shirt',
  'Watch',
  'Glasses',
  'Gem',
  'Sparkles',
  'Heart',
  'Baby',
  'Dog',
  'Cat',
  'Leaf',
  'Flower2',
  'Trees',
  'Droplets',
  'Droplet',
  'Flame',
  'Zap',
  'Battery',
  'Smartphone',
  'Laptop',
  'Tv',
  'Headphones',
  'Camera',
  'Printer',
  'Wrench',
  'Hammer',
  'Drill',
  'Paintbrush',
  'Brush',
  'Scissors',
  'Ruler',
  'BookOpen',
  'Notebook',
  'Pencil',
  'Pen',
  'Backpack',
  'Briefcase',
  'Gift',
  'Tag',
  'Tags',
  'Percent',
  'BadgePercent',
  'Truck',
  'Car',
  'Bike',
  'Bus',
  'Plane',
  'Ship',
  'MapPin',
  'Globe',
  'Building2',
  'Factory',
  'Warehouse',
  'Boxes',
  'Box',
  'Archive',
  'Layers',
  'LayoutGrid',
  'Grid3x3',
  'Star',
  'Award',
  'Trophy',
  'Medal',
  'Crown',
  'Shield',
  'Lock',
  'Key',
  'Wallet',
  'CreditCard',
  'Banknote',
  'Coins',
  'HandCoins',
  'CircleDollarSign',
  'Pill',
  'Syringe',
  'Stethoscope',
  'HeartPulse',
  'Dumbbell',
  'Activity',
  'Music',
  'Gamepad2',
  'Puzzle',
  'ToyBrick',
  'Balloon',
  'PartyPopper',
  'Sun',
  'Moon',
  'Cloud',
  'Snowflake',
  'Umbrella',
  'Footprints',
  'Hand',
  'Users',
  'User',
  'Smile',
  'Bone',
  'PawPrint',
  'Anvil',
  'Cog',
  'Settings',
  'Lightbulb',
  'Rocket',
  'Target',
  'Compass',
  'Anchor',
  'Mountain',
  'Tent',
  'Shell',
  'FishSymbol',
].filter((name) => BIRGA_ICON_NAMES.includes(name))

export function BirgaIcon({
  name,
  size = 18,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = icons[name as keyof typeof icons] as LucideIcon | undefined
  if (!Icon) {
    const Fallback = icons.Package as LucideIcon
    return <Fallback size={size} className={className} />
  }
  return <Icon size={size} className={className} />
}

interface IconPickerProps {
  value: string
  onChange: (name: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return POPULAR
    return BIRGA_ICON_NAMES.filter((name) => name.toLowerCase().includes(q)).slice(0, 180)
  }, [query])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          Icon {value ? <span className="text-[#397461]">({value})</span> : null}
        </p>
        <p className="text-[10px] text-slate-400">{BIRGA_ICON_NAMES.length}+ ta icon · qidiruv</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Icon qidirish (masalan: apple, car, shirt)..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none focus:border-[#397461] focus:bg-white"
        />
      </div>
      <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-2">
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {list.map((name) => {
            const active = value === name
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onChange(name)}
                className={`grid aspect-square place-items-center rounded-lg transition ${
                  active
                    ? 'bg-[#173c32] text-[#c9f560] shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-[#eff8f3] hover:text-[#173c32]'
                }`}
              >
                <BirgaIcon name={name} size={18} />
              </button>
            )
          })}
        </div>
        {list.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Mos icon topilmadi</p>
        )}
      </div>
      {!query && (
        <p className="text-[11px] text-slate-400">
          Yuqorida mashhur iconlar. Barcha {BIRGA_ICON_NAMES.length} ta icon uchun qidiruvdan foydalaning.
        </p>
      )}
    </div>
  )
}
