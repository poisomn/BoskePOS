import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { FiSearch } from 'react-icons/fi'

const BarcodeInput = forwardRef(function BarcodeInput({
  autoFocus = false,
  disabled = false,
  isLoading = false,
  label = 'Codigo de barras',
  onSubmit,
  placeholder = 'Escanea o escribe el codigo',
}, ref) {
  const inputRef = useRef(null)
  const lastSubmittedRef = useRef('')
  const [value, setValue] = useState('')

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current?.focus()
    },
  }))

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRef.current?.focus()
    }
  }, [autoFocus, disabled])

  useEffect(() => {
    if (!isLoading && !disabled) {
      inputRef.current?.focus()
    }
  }, [disabled, isLoading])

  async function submitBarcode() {
    const barcode = value.trim()

    if (!barcode || disabled || isLoading) {
      return
    }

    if (lastSubmittedRef.current === barcode) {
      inputRef.current?.focus()
      return
    }

    lastSubmittedRef.current = barcode

    try {
      await onSubmit(barcode)
      setValue('')
    } finally {
      lastSubmittedRef.current = ''
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitBarcode()
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="barcode-input">
        <span className="field-label">{label}</span>
        <input
          autoComplete="off"
          className="input"
          disabled={disabled}
          id="barcode-input"
          inputMode="text"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          value={value}
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          El lector debe enviar Enter al finalizar. Tambien puedes escribir el codigo manualmente.
        </p>
        <button
          className="btn btn-secondary"
          disabled={disabled || isLoading || !value.trim()}
          onClick={submitBarcode}
          type="button"
        >
          <FiSearch aria-hidden="true" />
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
    </div>
  )
})

export default BarcodeInput
