import type { InputHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string
  error?: string
  registration: UseFormRegisterReturn
}

const TextField = ({
  label,
  error,
  registration,
  id,
  className,
  ...rest
}: TextFieldProps) => {
  const inputId = id ?? registration.name
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`w-full rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500/90 shadow-sm backdrop-blur-sm transition duration-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/35 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:placeholder:text-slate-400/80 dark:focus:border-emerald-400/70 dark:focus:ring-emerald-400/40 ${
          error
            ? 'border-rose-400/70 focus:ring-rose-400/35 dark:border-rose-400/60 dark:focus:ring-rose-400/40'
            : ''
        } ${className ?? ''}`}
        {...registration}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-right text-xs text-rose-600 dark:text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default TextField
