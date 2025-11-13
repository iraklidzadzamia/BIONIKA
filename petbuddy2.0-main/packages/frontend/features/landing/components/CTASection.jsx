export default function CTASection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-luxury-600 to-primary-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          Ready to Transform Your Business?
        </h2>
        <p className="text-xl text-luxury-100 mb-8 max-w-2xl mx-auto">
          Join hundreds of successful pet grooming salons that trust PetBuddy to
          manage their operations and grow their business.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/register"
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-800 hover:from-neutral-200 hover:to-neutral-300 focus:ring-neutral-200 border-2 border-neutral-200 px-12 py-5 text-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free Trial
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 border-2 border-white bg-transparent text-white hover:bg-white hover:text-luxury-600 focus:ring-white px-12 py-5 text-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign In
          </a>
        </div>
      </div>
    </section>
  );
}
