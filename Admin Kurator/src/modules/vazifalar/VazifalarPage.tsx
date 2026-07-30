import { motion } from 'framer-motion'
import { Briefcase, Coins, MapPin, Users } from 'lucide-react'

export function VazifalarPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#eff8f3] text-[#397461]">
            <Briefcase size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Admin-kurator vazifalari</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Admin-kurator — bu MY DILER platformasining mahalladagi rasmiy vakili va tadbirkorlarning
              yordamchisidir. Uning kundalik ishi asosan 3 ta asosiy qadamdan iborat.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <TaskCard
          step="1"
          icon={Users}
          title="Tadbirkorlarni topish"
          description="Mahalla yettiligi (mahalla hokim yordamchisi) yordamida ishlab chiqaruvchilar va chakana do'konlarni aniqlash, ularga platforma foydasini tushuntirish."
          bullets={[
            'Ishlab chiqaruvchilar: mahsulotni butun O\'zbekiston bo\'ylab sotish, joylashtirish bepul, faqat 5% komissiya.',
            'Xaridorlar: ishlab chiqaruvchidan arzon narxda mahsulot, aksiyalar va bonuslar shaxsiy kabinetda.',
          ]}
        />
        <TaskCard
          step="2"
          icon={MapPin}
          title="Platformaga joylashtirish"
          description="Tadbirkorlarni saytda ro'yxatdan o'tkazish va mahsulotlarini admin-panel orqali tizimga kiritish."
          bullets={[
            'Mahsulot rasmlari, narxlari va tavsiflarini kiritish.',
            'Yangi mahsulotlar va narx o\'zgarishlarini yangilab borish.',
          ]}
        />
        <TaskCard
          step="3"
          icon={Briefcase}
          title="Onlayn nazorat va aloqa"
          description="Buyurtmalarni masofadan kuzatish va kelishuvlarning qonuniy bajarilishini nazorat qilish."
          bullets={[
            'Xaridor va sotuvchi o\'rtasidagi buyurtmalarni kuzatish.',
            'Shartnomalar va kelishuvlarning xavfsiz amalga oshirilishini ta\'minlash.',
          ]}
        />
      </div>

      <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Coins size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Moliyaviy rag'bat</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Admin-kurator o'z hududidagi ishlab chiqarish korxonalari barcha qilgan savdosidan{' '}
              <strong>2,5%</strong> daromad oladi. Asosiy ish — tadbirkorlarni platformaga a'zo qilish,
              mahsulotni bir marta joylashtirish va keyin doimiy savdodan passiv daromad olish.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function TaskCard({
  step,
  icon: Icon,
  title,
  description,
  bullets,
}: {
  step: string
  icon: typeof Users
  title: string
  description: string
  bullets: string[]
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-[#c9f560] text-xs font-bold text-[#173c32]">
          {step}
        </span>
        <div className="grid size-10 place-items-center rounded-xl bg-[#eff8f3] text-[#397461]">
          <Icon size={18} />
        </div>
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#397461]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  )
}
