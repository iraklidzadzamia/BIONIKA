export default function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description:
        "Create your account and set up your business profile in just a few clicks.",
    },
    {
      number: "2",
      title: "Configure",
      description:
        "Set up your services, staff, and business hours to match your operations.",
    },
    {
      number: "3",
      title: "Launch",
      description:
        "Start accepting bookings and managing your business with our powerful tools.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 px-4 bg-gradient-to-br from-neutral-50 to-luxury-50"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-6">
            Get Started in Minutes
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Our simple setup process gets you up and running quickly, so you can
            focus on what matters most - your business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 bg-luxury-600 text-white text-3xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
                {step.number}
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                {step.title}
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
