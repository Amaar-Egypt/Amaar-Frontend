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
  className,
  ...rest
}: TextFieldProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-right text-sm font-semibold text-slate-200">
        {label}
      </label>
      <input
        className={`w-full rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400/80 backdrop-blur-sm transition duration-200 focus:border-emerald-400/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? 'border-rose-400/60 focus:ring-rose-400/40' : ''
        } ${className ?? ''}`}
        {...registration}
        {...rest}
      />
      {error ? <p className="text-right text-xs text-rose-300">{error}</p> : null}
    </div>
  )
}

export default TextField
