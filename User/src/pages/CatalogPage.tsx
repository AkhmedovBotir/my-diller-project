import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import { EmptyState, FadeIn, PageHeader } from '../app/AppShell'
import { api } from '../shared/api'
import { formatMoney, resolveImage } from '../shared/money'
import type { Category, Product, Subcategory } from '../shared/types'

export function CatalogPage() {
  const { categoryId, subcategoryId } = useParams()
  const catId = categoryId ? Number(categoryId) : null
  const subId = subcategoryId ? Number(subcategoryId) : null

  if (subId && catId) return <ProductsView categoryId={catId} subcategoryId={subId} />
  if (catId) return <SubcategoriesView categoryId={catId} />
  return <CategoriesView />
}

function CategoriesView() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void api
      .categories()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader
        title="Katalog"
        subtitle="Kategoriya → subkategoriya → mahsulotlar bo‘yicha ko‘ring."
      />
      {loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="Kategoriyalar yo‘q" text="Tez orada katalog to‘ldiriladi." />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <FadeIn key={item.id} delay={index * 0.03}>
              <Link
                to={`/katalog/${item.id}`}
                className="group flex flex-col gap-3 rounded-[20px] bg-white p-3 ring-1 ring-[#102d26]/6 transition hover:-translate-y-0.5 hover:bg-[#102d26] hover:text-[#c9f560] sm:gap-4 sm:rounded-[24px] sm:p-5"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c9f560]/40 text-[#102d26] transition group-hover:bg-[#c9f560] sm:h-14 sm:w-14 sm:rounded-2xl">
                  <Package className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-snug sm:text-base">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-[11px] opacity-70 sm:text-xs">{item.description}</p>
                  ) : null}
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}

function SubcategoriesView({ categoryId }: { categoryId: number }) {
  const [category, setCategory] = useState<Category | null>(null)
  const [items, setItems] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      api.category(categoryId),
      api.subcategories({ category_id: categoryId }),
    ])
      .then(([cat, list]) => {
        setCategory(cat)
        setItems(list)
      })
      .catch(() => {
        setCategory(null)
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [categoryId])

  return (
    <div>
      <Breadcrumb
        items={[
          { to: '/katalog', label: 'Katalog' },
          { label: category?.name ?? 'Kategoriya' },
        ]}
      />
      <PageHeader
        title={category?.name ?? 'Subkategoriyalar'}
        subtitle="Kerakli guruhni tanlang"
      />
      {loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="Subkategoriya yo‘q" text="Bu kategoriyada hali guruhlar yo‘q." />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          {items.map((item, index) => (
            <FadeIn key={item.id} delay={index * 0.03}>
              <Link
                to={`/katalog/${categoryId}/${item.id}`}
                className="flex items-center justify-between rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-[#102d26]/6 transition hover:bg-[#102d26] hover:text-[#c9f560] sm:rounded-[24px] sm:px-5 sm:py-4"
              >
                <div className="min-w-0">
                  <p className="font-bold">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs opacity-70">{item.description}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-50" />
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductsView({
  categoryId,
  subcategoryId,
}: {
  categoryId: number
  subcategoryId: number
}) {
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null)
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      api.category(categoryId),
      api.subcategories({ category_id: categoryId }),
      api.products({ category_id: categoryId, subcategory_id: subcategoryId }),
    ])
      .then(([cat, subs, products]) => {
        setCategory(cat)
        setSubcategory(subs.find((s) => s.id === subcategoryId) ?? null)
        setItems(products)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [categoryId, subcategoryId])

  return (
    <div>
      <Breadcrumb
        items={[
          { to: '/katalog', label: 'Katalog' },
          { to: `/katalog/${categoryId}`, label: category?.name ?? 'Kategoriya' },
          { label: subcategory?.name ?? 'Mahsulotlar' },
        ]}
      />
      <PageHeader
        title={subcategory?.name ?? 'Mahsulotlar'}
        subtitle="Mahsulotni tanlang — ochiq yig‘imlarga o‘ting"
        action={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hidden h-11 rounded-2xl bg-[#102d26] px-4 text-sm font-bold text-[#c9f560] sm:inline-flex sm:items-center"
          >
            Yig‘imlar
          </button>
        }
      />
      {loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="Mahsulot yo‘q" text="Bu guruhda hali mahsulotlar yo‘q." />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {items.map((item, index) => {
            const photo = resolveImage(item.photo_url)
            return (
              <FadeIn key={item.id} delay={index * 0.03}>
                <Link
                  to={`/?product=${item.id}`}
                  className="overflow-hidden rounded-[20px] bg-white ring-1 ring-[#102d26]/6 transition hover:-translate-y-0.5 sm:rounded-[24px]"
                >
                  <div className="aspect-square bg-[#102d26]/5">
                    {photo ? (
                      <img src={photo} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-[#102d26]/20">
                        <Package className="h-8 w-8 sm:h-10 sm:w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-4">
                    <p className="line-clamp-2 text-[13px] font-bold leading-snug sm:text-base">
                      {item.name}
                    </p>
                    <p className="mt-1.5 text-sm font-black sm:mt-2 sm:text-base">{formatMoney(item.price)}</p>
                    <p className="mt-1 text-[10px] text-[#5f7a70] sm:text-[11px]">
                      {item.unit === 'kg' ? 'Kg' : item.unit === 'litr' ? 'Litr' : 'Dona'}
                    </p>
                  </div>
                </Link>
              </FadeIn>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Breadcrumb({
  items,
}: {
  items: { to?: string; label: string }[]
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 text-xs font-semibold text-[#5f7a70]">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-50" /> : null}
          {item.to ? (
            <Link to={item.to} className="hover:text-[#102d26]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#102d26]">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-[20px] bg-white/70 sm:rounded-[24px]" />
      ))}
    </div>
  )
}
