import AnalyticsPage from '../pages/AnalyticsPage';
import { TradingAccount } from '../utils/types';
import { TradingRule } from '../utils/rulesEngine';

interface AnalyticsViewProps {
  trades: any[];
  account: TradingAccount;
  analytics: any;
  rules: TradingRule[];
}

export default function AnalyticsView({ trades, account, analytics, rules }: AnalyticsViewProps) {
  return <AnalyticsPage trades={trades} account={account} analytics={analytics} rules={rules} />;
}
