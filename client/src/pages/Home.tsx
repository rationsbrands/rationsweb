import { Link } from 'react-router-dom'
import Button from '../shared/ui/Button'
import Menu from './Menu'
import Community from './Community'
import SEO from '../components/SEO'
import StructuredData from '../components/StructuredData'
import heroBg from '../assets/background2-optimized-CjkZWacr.jpg'
import gallery1 from '../assets/1-B1FmfQ8l.jpeg'
import gallery2 from '../assets/2-optimized-BJgNKdQB.jpg'
import gallery3 from '../assets/3-optimized-dofIgniE.jpg'

const whyRations = [
  {
    title: 'Fresh. Every time.',
    description: "No reheated shortcuts. Every meal is prepared to order with ingredients we'd eat ourselves."
  },
  {
    title: 'Ready in minutes',
    description: 'Fast food that is actually fast. Your order moves from kitchen to hands without the wait.'
  },
  {
    title: 'Priced for real life',
    description: 'Good food should not be a luxury. Rations is built for students, workers, and everyday people.'
  },
  {
    title: 'Come back tomorrow',
    description: 'Our menu is designed to become your go to. Not just a one time try a daily habit.'
  }
]

const gallery = [
  { src: gallery1, alt: 'Fresh ingredients prepared at Rations' },
  { src: gallery2, alt: 'Signature Rations dish plating' },
  { src: gallery3, alt: 'Rations community moments' },
]

export default function Home() {
  return (
    <div className="space-y-8 sm:space-y-12 md:space-y-16 pb-8 sm:pb-12">
      <SEO
        title="Rations - Made for you. Real food, ready when you are."
        description="Rations is a fast food brand for people who want real meals, not compromises. Hot food, ready when you are. Order now at rationsfood.com."
        canonicalUrl="/"
      />
      <StructuredData />
      <section className="relative w-full">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-black/50" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20 md:py-28 text-center text-white">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight animate-slide-up">
            Hot food, ready when you are.
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto animate-slide-up animate-delay-1">
            Real meals. No compromises. Order in seconds, eat in minutes.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
            <Link to="/menu" className="w-full sm:w-auto">
              <Button className="w-auto sm:w-auto bg-ration-yellow text-ration-dark font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-lg text-sm sm:text-lg hover:bg-ration-yellow-hover transition duration-300 animate-slide-up animate-delay-2">
                Order Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-6 sm:gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">We built Rations because fast food should actually taste good.</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              Rations is a QSR brand built on one principle, you should not have to choose between speed and quality. Every item on our menu is made fresh, priced fairly, and ready before you can change your mind.
            </p>
            <div className="mt-4 sm:mt-6">
              <Link
                to="/about"
                className="inline-flex items-center justify-center rounded-full bg-ration-dark px-5 py-2 sm:py-3 text-sm sm:text-base text-white transition hover:translate-y-[-1px] hover:shadow-lg"
              >
                Read Our Story
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-8 md:mt-0">
            {gallery.map((g, i) => (
              <div
                key={`${g.alt}-${i}`}
                className={`relative aspect-[4/5] overflow-hidden rounded-2xl shadow-sm ${i === 1 ? 'translate-y-4 sm:translate-y-6' : ''}`}
              >
                <img src={g.src} alt={g.alt} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="text-xl sm:text-3xl font-bold text-center mb-4 sm:mb-8">Why Rations?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-8">
          {whyRations.map((reason) => (
            <div key={reason.title} className="bg-white dark:bg-slate-900 p-2 sm:p-6 rounded-lg shadow-md">
              <h3 className="text-sm sm:text-xl font-semibold text-brand-dark">{reason.title}</h3>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-base text-gray-600 dark:text-gray-400">{reason.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6 animate-slide-up">
        <h2 className="text-xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">What people are ordering right now</h2>
        <div className="max-w-5xl mx-auto">
          <Menu embed />
        </div>
        <div className="text-center mt-6 sm:mt-8">
          <Link to="/menu" className="text-brand-primary font-semibold hover:underline text-sm sm:text-base">
            See Full Menu &rarr;
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6 space-y-8 sm:space-y-10 animate-slide-up animate-delay-2">
        <div className="text-center bg-ration-dark rounded-lg p-6 sm:p-8 shadow-md">
          <h2 className="text-xl sm:text-3xl text-white font-bold mb-3 sm:mb-4">Rations is bigger than food.</h2>
          <p className="text-sm sm:text-lg text-gray-300 mb-4 sm:mb-6">
            Follow what's happening. New drops, special events, announcements, and the people behind every meal.
          </p>
          <Link
            to="/community"
            className="inline-block bg-ration-yellow text-ration-dark font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-lg text-sm sm:text-base hover:bg-ration-yellow-hover transition duration-300"
          >
            Join the Community
          </Link>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-center md:text-left">From the community</h2>
          <Community embed />
        </div>
      </section>
    </div>
  )
}
