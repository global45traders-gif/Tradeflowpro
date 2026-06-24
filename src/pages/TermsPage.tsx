import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Shield, Clock } from 'lucide-react';

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

export default function TermsPage() {
  const navigate = useNavigate();
  useSEO({
    title: 'Terms of Service',
    description: 'Read the terms of use, trading disclaimers, and user policies for the TradeFlowPro platform.',
    path: '/terms',
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
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Terms of Service</h1>
                <p className="text-xs text-slate-500 mt-0.5">Last updated: June 24, 2026</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-3 py-1 ring-1 ring-emerald-500/20 max-w-max">
              <Clock className="h-3 w-3" />
              <span>Effective Immediately</span>
            </div>
          </div>

          {/* Important Notice Alert */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-8 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <Shield className="h-4 w-4 text-amber-500" />
              <span>IMPORTANT TRADING DISCLAIMER</span>
            </div>
            <p>
              TradeFlowPro is a trading journal and performance analytics platform. **We do not provide financial, investment, or trading advice.** All metrics, analytics, and insights are calculated from data you provide and are for educational and informational purposes only. Trading involves significant risk, and you are solely responsible for your trading decisions and capital.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-xs md:text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">1. Introduction</h2>
              <p>
                Welcome to TradeFlowPro. These Terms of Service ("Terms") govern your access to and use of our website, applications, and services. By accessing or using TradeFlowPro, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">2. Eligibility</h2>
              <p>
                You must be at least 18 years of age or the legal age of majority in your jurisdiction to use TradeFlowPro. By using the platform, you represent and warrant that you meet this requirement and possess the legal capacity to enter into this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">3. Account Registration</h2>
              <p>
                To access certain features of TradeFlowPro, you must register for an account using a valid email or supported single sign-on providers (such as Google Authentication). You agree to provide accurate, current, and complete information and maintain the security of your login credentials. You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">4. Acceptable Use</h2>
              <p>
                You agree to use TradeFlowPro solely for lawful personal analysis. You shall not:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Reverse engineer, disassemble, or manipulate any proprietary software.</li>
                <li>Bypass security measures or attempt unauthorized access to our databases.</li>
                <li>Import spam, malicious scripts, or corrupted files into the journal interface.</li>
                <li>Use automated scripts, scraper engines, or bots to fetch analytics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">5. Subscriptions & Payments</h2>
              <p>
                TradeFlowPro may offer tier-based premium subscriptions. Payments are billed on a recurring monthly or annual basis. Subscriptions automatically renew unless canceled before the billing date. All payments are processed securely via third-party payment gateways, and all transactions are subject to tax regulations applicable in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">6. User Responsibilities & Trading Disclaimer</h2>
              <p>
                You acknowledge that trading stocks, options, futures, cryptocurrencies, and forex is highly speculative and carries a substantial risk of financial loss.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>You are solely responsible for evaluating the risks associated with trading markets.</li>
                <li>Historical performance logged in your journal does not guarantee future outcomes.</li>
                <li>You will not hold TradeFlowPro, its creators, or partners liable for any trading losses incurred.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">7. Intellectual Property</h2>
              <p>
                All code, design systems, logos, illustrations, graphics, copy, and database schemas are the intellectual property of TradeFlowPro. You are granted a limited, non-exclusive, non-transferable, revocable license to access our dashboard for personal analysis.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">8. Account Suspension & Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at our sole discretion, without notice, if we believe you have violated these Terms or engaged in behavior that harms our system, security, or other users.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, TradeFlowPro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">10. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of **India**, without regard to its conflict of law principles. Any legal actions or proceedings arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in India.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">11. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. When we make updates, we will revise the "Last updated" date. Your continued use of TradeFlowPro after any updates constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">12. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
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
