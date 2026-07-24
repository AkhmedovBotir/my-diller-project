import { useEffect, useLayoutEffect, useRef } from 'react'
import Quill from 'quill'
import { Delta } from 'quill'
import 'quill/dist/quill.snow.css'
import type { QuillDelta } from './types'
import { normalizeDelta, isDeltaEmpty } from './product'

type Props = {
  value?: QuillDelta | string | null
  onChange: (delta: QuillDelta) => void
  placeholder?: string
  invalid?: boolean
  readOnly?: boolean
  minHeight?: number
}

function toQuillDelta(value: QuillDelta | string | null | undefined) {
  const normalized = normalizeDelta(value)
  return new Delta(normalized.ops ?? [{ insert: '\n' }])
}

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link'],
  ['clean'],
]

export function QuillEditor({
  value,
  onChange,
  placeholder = 'Mahsulot tavsifini yozing...',
  invalid = false,
  readOnly = false,
  minHeight = 180,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const applyingRef = useRef(false)
  const initialValueRef = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // useLayoutEffect: Strict Mode cleanup DOM ni sync tozalaydi, ikkinchi editor qolmaydi
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.replaceChildren()
    const mountPoint = document.createElement('div')
    container.appendChild(mountPoint)

    const quill = new Quill(mountPoint, {
      theme: 'snow',
      readOnly,
      placeholder,
      modules: {
        toolbar: readOnly ? false : toolbarOptions,
      },
    })

    applyingRef.current = true
    quill.setContents(toQuillDelta(initialValueRef.current), 'silent')
    applyingRef.current = false

    const onTextChange = (_delta: unknown, _old: unknown, source: string) => {
      if (applyingRef.current || source !== 'user') return
      const contents = quill.getContents()
      onChangeRef.current({ ops: contents.ops } as QuillDelta)
    }

    quill.on('text-change', onTextChange)
    quillRef.current = quill

    return () => {
      quill.off('text-change', onTextChange)
      quillRef.current = null
      container.replaceChildren()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill) return
    quill.enable(!readOnly)
  }, [readOnly])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill) return

    const next = toQuillDelta(value)
    const current = quill.getContents()
    if (JSON.stringify(current.ops) === JSON.stringify(next.ops)) return

    applyingRef.current = true
    const selection = quill.getSelection()
    quill.setContents(next, 'silent')
    if (selection && !readOnly) {
      try {
        quill.setSelection(selection)
      } catch {
        // Selection may be out of range after content replace.
      }
    }
    applyingRef.current = false
  }, [value, readOnly])

  return (
    <div
      className={`quill-shell overflow-hidden rounded-xl border bg-white transition ${
        invalid
          ? 'border-red-300 ring-4 ring-red-100'
          : 'border-slate-200 focus-within:border-[#397461] focus-within:ring-4 focus-within:ring-[#397461]/8'
      } ${readOnly ? 'quill-shell-readonly' : ''}`}
      style={{ ['--quill-min-height' as string]: `${minHeight}px` }}
    >
      <div ref={containerRef} />
    </div>
  )
}

export function QuillViewer({
  value,
  emptyText = 'Tavsif yo‘q',
}: {
  value?: QuillDelta | string | null
  emptyText?: string
}) {
  if (isDeltaEmpty(value)) {
    return <p className="text-sm text-slate-400">{emptyText}</p>
  }

  return <QuillEditor value={value} onChange={() => undefined} readOnly minHeight={120} />
}
