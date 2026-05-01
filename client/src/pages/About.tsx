import { Link } from 'react-router-dom'

export default function About() {
  return (
    <main className="min-h-screen text-ration-dark">
      <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ration-dark via-black to-ration-dark" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-ration-yellow/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-ration-yellow/20 blur-3xl" />
        <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]">
          <div className="h-full w-full bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-24 text-center">
          <h1 className="mt-6 text-2xl sm:text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            About <span className="text-ration-yellow">Rations</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-lg text-white/85">
            Wholesome, affordable meals that celebrate local flavor and bring communities together.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm sm:text-lg leading-relaxed text-gray-800 dark:text-gray-200">
            At <span className="font-semibold text-ration-dark">Rations</span>, we believe food is more than fuel, it's culture, connection, and community.
            Our mission is simple: make wholesome, affordable, and accessible meals part of everyday life while celebrating the richness of local flavors.
          </p>
          <p className="mt-4 sm:mt-6 text-sm sm:text-lg leading-relaxed text-gray-800 dark:text-gray-200">
            We're not just building a food brand, we're building a movement. From sourcing quality ingredients to creating meals for modern lifestyles,
            everything we do is guided by our core values.
          </p>
        </div>

        <div className="mt-8 sm:mt-14 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-r from-ration-yellow/10 to-transparent p-3 sm:p-6">
          <div className="grid items-center gap-3 sm:gap-6 md:grid-cols-3">
            {[
              { label: 'Our Promise', title: 'Transparent Ingredients', desc: 'Honest sourcing, and recipes you can trust.' },
              { label: 'Our Impact', title: 'Community at Heart', desc: 'We partner with local producers and give back to the neighborhoods we serve.' },
              { label: 'Our Flavor', title: 'Rooted in Culture', desc: 'Authentic tastes reimagined for today, comforting, vibrant, and fresh.' },
            ].map((item) => (
              <div key={item.title} className="text-center md:text-left">
                <div className="text-xs sm:text-sm font-medium text-ration-dark/70">{item.label}</div>
                <div className="mt-1 text-lg sm:text-2xl font-bold text-ration-dark">{item.title}</div>
                <p className="mt-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <blockquote className="border-l-4 border-red-600 pl-4 mt-8 sm:mt-16 max-w-3xl">
          <p className="text-base sm:text-xl font-semibold text-ration-dark">
            Rations: Real food. Real people. Real moments.
          </p>
        </blockquote>

        <div className="mt-8 sm:mt-10 text-center flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <Link to="/menu" className="inline-flex items-center justify-center bg-ration-dark text-white px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded-lg min-h-[44px]">Explore Menu</Link>
          <Link to="/community" className="inline-flex items-center justify-center bg-ration-dark text-white px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded-lg min-h-[44px]">Join Our Community</Link>
        </div>
      </section>
    </main>
  )
}