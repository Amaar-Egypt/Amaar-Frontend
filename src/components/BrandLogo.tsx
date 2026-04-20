import logo from "../assets/logo.png"

const BrandLogo = () => {
  return (
    <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-emerald-200/70 bg-white/80 shadow-[0_0_40px_rgba(16,185,129,0.22)] backdrop-blur-md dark:border-white/20 dark:bg-black/40 dark:shadow-[0_0_40px_rgba(16,185,129,0.35)]">
      <img
        src={logo}
        alt="Amaar logo"
        className="h-16 w-16 object-contain"
      />
    </div>
  )
}

export default BrandLogo