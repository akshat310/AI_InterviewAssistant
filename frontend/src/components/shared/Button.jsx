export default function Button({
  children, onClick, variant = 'primary',
  disabled = false, className = '', type = 'button'
}) {
  const base = "px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40",
    secondary: "bg-dark-600 hover:bg-dark-500 text-white border border-dark-500 hover:border-primary-500",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30",
    ghost: "hover:bg-dark-600 text-gray-300 hover:text-white"
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}