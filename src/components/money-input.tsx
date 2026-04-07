'use client'

import { useEffect, useMemo, useState } from 'react'

function formatBRLFromDigits(digits: string) {
  const onlyDigits = digits.replace(/\D/g, '')
  const cents = onlyDigits ? Number(onlyDigits) : 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function digitsFromAny(value: string) {
  const cleaned = value.replace(/\D/g, '')
  return cleaned.replace(/^0+(?=\d)/, '')
}

export function MoneyInput({
  name,
  defaultValue,
  placeholder,
  required,
  className,
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  className?: string
}) {
  const initialDigits = useMemo(() => digitsFromAny(defaultValue ?? ''), [defaultValue])
  const [digits, setDigits] = useState(initialDigits)

  useEffect(() => {
    setDigits(initialDigits)
  }, [initialDigits])

  const display = formatBRLFromDigits(digits)

  return (
    <>
      <input type="hidden" name={name} value={display} />
      <input
        inputMode="numeric"
        placeholder={placeholder}
        required={required}
        value={display}
        onChange={(e) => setDigits(digitsFromAny(e.target.value))}
        className={className}
      />
    </>
  )
}

