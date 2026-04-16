import logo from "../assets/logo.png"

const BrandLogo = () => {
  return (
    <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-black/40 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-md">
      <img
        src={logo}
        alt="Amaar logo"
        className="h-16 w-16 object-contain"
      />
    </div>
  )
}

export default BrandLogo