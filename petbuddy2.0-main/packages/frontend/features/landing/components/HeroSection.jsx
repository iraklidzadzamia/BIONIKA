export default function HeroSection() {
  return (
    <section className="relative py-20 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="mb-8">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 bg-gradient-to-r from-neutral-900 via-luxury-700 to-primary-600 bg-clip-text text-transparent">
            Transform Your Pet Business
          </h1>
          <p className="text-xl sm:text-2xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            The ultimate platform for modern pet grooming salons. Streamline
            bookings, manage your team, and deliver exceptional customer
            experiences with our luxury-grade management system.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <a
            href="/register"
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 bg-gradient-to-r from-luxury-500 to-luxury-600 text-white hover:from-luxury-600 hover:to-luxury-700 focus:ring-luxury-200 shadow-soft hover:shadow-luxury px-12 py-5 text-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free Trial
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 border-2 border-primary-500 bg-white text-primary-600 hover:bg-primary-50 focus:ring-primary-200 px-12 py-5 text-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            See How It Works
          </a>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-luxury-100/30 to-primary-100/30 -z-10"></div>
      <div className="absolute top-20 right-10 w-72 h-72 bg-luxury-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl"></div>
    </section>
  );
}
