import { SITE } from '../config/site'

export default function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-6 flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-start md:items-center">
        {/* LEFT col */}
        <div className="flex flex-col">
          <span className="font-semibold text-ration-dark dark:text-white">{SITE.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{SITE.tagline}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">© {new Date().getFullYear()} Rations Brands Limited. All rights reserved.</span>
        </div>

        {/* CENTER col */}
        <div className="flex items-center gap-4">
          {SITE.socials.filter(s => !!s.url).map((social) => {
            const Icon = social.icon
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="text-slate-500 dark:text-slate-400 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = social.hoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}
              >
                <Icon size={18} />
              </a>
            )
          })}
        </div>

        {/* RIGHT col */}
        <div className="flex flex-col text-left md:text-right">
          <a href="mailto:info@rationsfood.com" className="text-xs text-slate-600 dark:text-slate-300 hover:text-ration-yellow transition-colors">
            info@rationsfood.com
          </a>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Made just for you.</p>
        </div>
      </div>
    </footer>
  )
}
