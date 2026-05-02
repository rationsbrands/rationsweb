import { SITE } from '../config/site'
import ContactIllustration from '../assets/undraw_contact-us_kcoa 1-PvdDtSNb.svg'
import SEO from '../components/SEO'

export default function Contact() {
  const email = SITE.contacts.email
  const phone = SITE.contacts.phone
  const whatsapp = SITE.contacts.whatsapp
  const location = SITE.contacts.location

  return (
    <section className="bg-[#F9FAFB] dark:bg-slate-950 py-6 sm:py-10">
      <SEO
        title="Contact Us"
        description="Contact Rations. Order via WhatsApp, call us, or send an email. We respond fast just like our food."
        canonicalUrl="/contact"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-center text-ration-dark dark:text-white mb-6 sm:mb-14">
          Talk to Us
        </h1>
        <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center">
          {/* Contact Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-8 space-y-4 sm:space-y-8 shadow-sm hover:shadow-lg transition-shadow">
            <h2 className="text-lg sm:text-2xl font-bold text-ration-dark dark:text-white">
              We're easy to reach.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Whether you want to place an order, give feedback, or just say Hi. Pick the channel that works for you. We actually respond.
            </p>
            {/* Email */}
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Email
              </h3>
              <a
                href={`mailto:${SITE.contacts.email}`}
                className="text-ration-dark dark:text-white font-medium hover:text-ration-yellow dark:hover:text-ration-yellow transition-colors"
              >
                {SITE.contacts.email}
              </a>
            </div>
            {/* Phone */}
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Phone
              </h3>
              <a
                href={`tel:${SITE.contacts.phone}`}
                className="text-ration-dark dark:text-white font-medium hover:text-ration-yellow dark:hover:text-ration-yellow transition-colors"
              >
                {SITE.contacts.phone}
              </a>
            </div>
            {/* WhatsApp */}
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                WhatsApp
              </h3>
              <a
                href={SITE.contacts.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-ration-green px-6 py-3 min-h-[44px] text-white font-medium hover:bg-ration-green-hover transition-colors"
              >
                Chat on WhatsApp
              </a>
            </div>
            {/* Location */}
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Location
              </h3>
              <a
                href="https://maps.app.goo.gl/P4G1SLF8Kt36jaDk7"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-700 dark:text-gray-300 hover:text-ration-yellow transition-colors leading-relaxed"
              >
                {location}
              </a>
            </div>
          </div>
          {/* Illustration Section */}
          <div className="flex justify-center">
            <img
              src={ContactIllustration}
              alt="Rations Contact illustration"
              loading="lazy"
              className="max-w-full h-auto rounded-xl shadow-sm hover:shadow-md transition-shadow"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
