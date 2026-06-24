import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Clock } from 'lucide-react';

function useSEO({ title, description, path }: { title: string; description: string; path: string }) {
  useEffect(() => {
    document.title = `${title} | TradeFlowPro`;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const fullUrl = `https://tradeflowpro.com${path}`;
    canonical.setAttribute('href', fullUrl);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', `${title} | TradeFlowPro`);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', description);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', fullUrl);
  }, [title, description, path]);
}

export default function CookiePage() {
  const navigate = useNavigate();
  useSEO({
    title: 'Cookie Policy',
    description: 'Learn about the essential, preference, and analytics cookies used to power TradeFlowPro.',
    path: '/cookies',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/50 bg-white/95 dark:bg-[#020617]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer bg-transparent border-0 outline-none"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </button>
          <span className="text-xs font-bold text-slate-400">TradeFlowPro Legal</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 md:p-10 shadow-xl backdrop-blur-sm">
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Cookie Policy</h1>
                <p className="text-xs text-slate-500 mt-0.5">Last updated: June 24, 2026</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-3 py-1 ring-1 ring-emerald-500/20 max-w-max">
              <Clock className="h-3 w-3" />
              <span>Strict Privacy Controls</span>
            </div>
          </div>

          {/* Core policy description */}
          <div className="space-y-6 text-xs md:text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
            <p>
              TradeFlowPro uses cookies and similar storage technologies to ensure our website functions correctly, preserves your security, and remembers your custom dashboard choices. 
            </p>
            <p className="font-semibold text-slate-900 dark:text-white">
              TradeFlowPro uses essential cookies required for authentication and security. Analytics cookies are optional and only used when enabled by you.
            </p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Types of Cookies We Use</h2>
              
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-950/10">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs mb-1">1. Essential Cookies (Strictly Necessary)</h3>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    These cookies are vital to security, system administration, and login state. Without them, you would not be able to authenticate into the TradeFlowPro dashboard or save your accounts.
                  </p>
                  <p className="text-[10px] font-mono mt-2 text-slate-500">
                    Examples: Session tokens, CSRF validation, database auth signatures.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-950/10">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs mb-1">2. Preference Cookies (Functional)</h3>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    These allow us to store customization selections, avoiding having to re-adjust settings on every session load.
                  </p>
                  <p className="text-[10px] font-mono mt-2 text-slate-500">
                    Examples: Dark mode toggles (dark/light), selected default account settings, active currency formats.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-950/10">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs mb-1">3. Analytics Cookies (Optional)</h3>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    These cookies track how visitors interact with public and dashboard components to help us locate loading delays and refine workflow pathways. **These are only set if you consent via our consent banner.**
                  </p>
                  <p className="text-[10px] font-mono mt-2 text-slate-500">
                    Examples: Interaction counts, route latency measurements.
                  </p>
                </div>
              </div>
            </div>

            <section className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Managing Your Cookie Preferences</h2>
              <p>
                You can change your consent preferences directly using our website banner or by clearing your browser cache. Clearing cookies will log you out of your current session and revert system configurations back to their defaults.
              </p>
            </section>

            <section className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Contact Us</h2>
              <p>
                If you have questions about this Cookie Policy, reach out to our team at:
              </p>
              <p className="mt-2 font-semibold text-emerald-600 dark:text-emerald-400">
                support@tradeflowpro.com
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
