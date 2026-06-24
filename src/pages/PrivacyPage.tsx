import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Eye, Clock } from 'lucide-react';

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

export default function PrivacyPage() {
  const navigate = useNavigate();
  useSEO({
    title: 'Privacy Policy',
    description: 'Understand how TradeFlowPro collects, stores, protects, and handles your user data and trading logs.',
    path: '/privacy',
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
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
                <p className="text-xs text-slate-500 mt-0.5">Last updated: June 24, 2026</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-3 py-1 ring-1 ring-emerald-500/20 max-w-max">
              <Clock className="h-3 w-3" />
              <span>We Protect Your Data</span>
            </div>
          </div>

          {/* Important Transparency Notice */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-8 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <ShieldAlert className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>OUR COMMITMENT TO TRANSPARENCY</span>
            </div>
            <p>
              TradeFlowPro was built on the core principle of user trust. **We do not sell, rent, trade, or distribute your personal information or trading logs to third-party data brokers or advertisers.** Your data remains private and secure.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-xs md:text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">1. Information We Collect</h2>
              <p>We collect only the information necessary to provide, secure, and improve our services:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Identity Data:</strong> Name and email address when you register.</li>
                <li><strong>Authentication Info:</strong> Secure login tokens provided by Google OAuth or our database passwordless handlers. We do not store passwords.</li>
                <li><strong>Trading Data & Journal Entries:</strong> Log dates, buy/sell values, quantity, notes, setups, custom charges, and emotional tags.</li>
                <li><strong>Technical Data:</strong> Device IP addresses, browser version, operating system, and system performance logs to debug runtime errors.</li>
                <li><strong>Usage Analytics:</strong> Anonymized interaction logs detailing clicked items and page load duration.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">2. Why We Collect Data</h2>
              <p>We use your collected information to operate, analyze, and refine TradeFlowPro:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Authentication:</strong> Keeping you logged in securely across devices.</li>
                <li><strong>Account Management:</strong> Configuring your starting capital, accounts, and risk rules.</li>
                <li><strong>Platform Analytics:</strong> Calculating win-rates, profit factors, drawdowns, and expectancy metrics.</li>
                <li><strong>Customer Support:</strong> Responding to user feedback, bug submissions, or database restore requests.</li>
                <li><strong>Platform Improvements:</strong> Tracking feature usage to optimize loading speeds and user interface design.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">3. Third-Party Services</h2>
              <p>We utilize trusted third-party providers for hosting, authentication, database security, and computing functions. These partners are prohibited from using your data for direct marketing:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Supabase:</strong> Main secure database hosting, session controls, and table structures.</li>
                <li><strong>Google OAuth:</strong> Secure single-sign-on integration.</li>
                <li><strong>Vercel:</strong> Static and serverless hosting infrastructure.</li>
                <li><strong>OpenAI (Only when AI releases):</strong> Will process journal insights once the AI Coach feature flag is enabled. Currently inactive.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">4. User Rights</h2>
              <p>You have full ownership of your data. You may exercise these controls at any time:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Download Data:</strong> Export all journal logs as a spreadsheet (XLSX) from the dashboard settings.</li>
                <li><strong>Update Information:</strong> Edit your profile name, accounts, and custom parameters.</li>
                <li><strong>Delete Account:</strong> Trigger a full purge of your account profile, trades, rules, and login credentials via settings. Deleted data is cleared permanently from our servers.</li>
                <li><strong>Contact Support:</strong> Request clarifications on privacy actions by reaching out to our support channel.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">5. Data Retention</h2>
              <p>
                We retain your trading data and account profiles as long as your account is active. If your account is inactive for more than 24 consecutive months, we may securely archive your account to preserve hosting resources. Upon triggering "Delete Account" from settings, your profile and logs are permanently deleted within 7 days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">6. Security Practices</h2>
              <p>
                We employ industry-standard security practices to protect your records. All incoming and outgoing network requests use HTTPS/TLS protocols. Databases are protected with row-level security (RLS) policies, ensuring that users can only view or write to their own row values.
              </p>
            </section>

            <section className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">7. Contact Information</h2>
              <p>
                For suggestions, questions, or privacy compliance requests, contact us at:
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
