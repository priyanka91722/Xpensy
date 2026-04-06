import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, ChartPie as PieChart } from 'lucide-react-native';

interface CategoryStat {
  category: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryStat[]>(
    []
  );
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      // Get all transactions with categories
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select(
          `
          amount,
          type,
          date,
          categories (
            name,
            icon,
            color
          )
        `
        );

      if (fetchError) throw fetchError;

      // Calculate totals
      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      setTotalIncome(income);
      setTotalExpenses(expenses);

      // Group by category for expenses
      const expensesMap = new Map<
        string,
        { amount: number; color: string; icon: string }
      >();
      transactions
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const category = t.categories.name;
          const existing = expensesMap.get(category);
          expensesMap.set(category, {
            amount: (existing?.amount || 0) + parseFloat(t.amount),
            color: t.categories.color,
            icon: t.categories.icon,
          });
        });

      const expensesArray: CategoryStat[] = Array.from(
        expensesMap.entries()
      ).map(([category, data]) => ({
        category,
        amount: data.amount,
        color: data.color,
        icon: data.icon,
        percentage: expenses > 0 ? (data.amount / expenses) * 100 : 0,
      }));

      expensesArray.sort((a, b) => b.amount - a.amount);
      setExpensesByCategory(expensesArray);

      // Group by category for income
      const incomeMap = new Map<
        string,
        { amount: number; color: string; icon: string }
      >();
      transactions
        .filter((t) => t.type === 'income')
        .forEach((t) => {
          const category = t.categories.name;
          const existing = incomeMap.get(category);
          incomeMap.set(category, {
            amount: (existing?.amount || 0) + parseFloat(t.amount),
            color: t.categories.color,
            icon: t.categories.icon,
          });
        });

      const incomeArray: CategoryStat[] = Array.from(incomeMap.entries()).map(
        ([category, data]) => ({
          category,
          amount: data.amount,
          color: data.color,
          icon: data.icon,
          percentage: income > 0 ? (data.amount / income) * 100 : 0,
        })
      );

      incomeArray.sort((a, b) => b.amount - a.amount);
      setIncomeByCategory(incomeArray);

      // Calculate monthly stats (last 6 months)
      const monthlyMap = new Map<string, { income: number; expenses: number }>();
      transactions.forEach((t) => {
        const date = new Date(t.date);
        const monthKey = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
        if (t.type === 'income') {
          existing.income += parseFloat(t.amount);
        } else {
          existing.expenses += parseFloat(t.amount);
        }
        monthlyMap.set(monthKey, existing);
      });

      const monthlyArray: MonthlyData[] = Array.from(
        monthlyMap.entries()
      ).map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
      }));

      monthlyArray.sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateB.getTime() - dateA.getTime();
      });

      setMonthlyStats(monthlyArray.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Your financial insights</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={styles.summaryIncome}>
              ${totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <TrendingDown size={20} color="#EF4444" />
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryExpense}>
              ${totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.savingsContainer}>
          <Text style={styles.savingsLabel}>Savings Rate</Text>
          <Text
            style={[
              styles.savingsRate,
              savingsRate >= 0 ? styles.positiveRate : styles.negativeRate,
            ]}>
            {savingsRate.toFixed(1)}%
          </Text>
        </View>
      </View>

      {expensesByCategory.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={20} color="#111827" />
            <Text style={styles.sectionTitle}>Expenses by Category</Text>
          </View>
          <View style={styles.categoryList}>
            {expensesByCategory.map((item, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: item.color + '20' },
                    ]}>
                    <Text style={styles.categoryIconText}>{item.icon}</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    {item.percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {incomeByCategory.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={20} color="#111827" />
            <Text style={styles.sectionTitle}>Income by Category</Text>
          </View>
          <View style={styles.categoryList}>
            {incomeByCategory.map((item, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: item.color + '20' },
                    ]}>
                    <Text style={styles.categoryIconText}>{item.icon}</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    {item.percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {monthlyStats.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#111827" />
            <Text style={styles.sectionTitle}>Monthly Overview</Text>
          </View>
          {monthlyStats.map((month, index) => {
            const netIncome = month.income - month.expenses;
            const maxAmount = Math.max(
              ...monthlyStats.map((m) => Math.max(m.income, m.expenses))
            );

            return (
              <View key={index} style={styles.monthItem}>
                <Text style={styles.monthLabel}>{month.month}</Text>
                <View style={styles.monthBars}>
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>Income</Text>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.bar,
                          styles.incomeBar,
                          {
                            width: `${(month.income / maxAmount) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>
                      ${month.income.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>Expense</Text>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.bar,
                          styles.expenseBar,
                          {
                            width: `${(month.expenses / maxAmount) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>
                      ${month.expenses.toFixed(0)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.netIncome,
                    netIncome >= 0 ? styles.positiveNet : styles.negativeNet,
                  ]}>
                  Net: {netIncome >= 0 ? '+' : ''}${netIncome.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {expensesByCategory.length === 0 && incomeByCategory.length === 0 && (
        <View style={styles.emptyState}>
          <PieChart size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No data yet</Text>
          <Text style={styles.emptySubtext}>
            Add transactions to see your statistics
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryIncome: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  summaryExpense: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  savingsContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  savingsRate: {
    fontSize: 24,
    fontWeight: '700',
  },
  positiveRate: {
    color: '#10B981',
  },
  negativeRate: {
    color: '#EF4444',
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  categoryList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 13,
    color: '#6B7280',
  },
  monthItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  monthBars: {
    marginBottom: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 70,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  barBackground: {
    flex: 1,
    height: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  incomeBar: {
    backgroundColor: '#10B981',
  },
  expenseBar: {
    backgroundColor: '#EF4444',
  },
  barValue: {
    width: 70,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  netIncome: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  positiveNet: {
    color: '#10B981',
  },
  negativeNet: {
    color: '#EF4444',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});
