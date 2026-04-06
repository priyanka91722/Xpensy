import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: string;
  amount: string;
  description: string;
  date: string;
  type: 'expense' | 'income';
  categories: {
    name: string;
    icon: string;
    color: string;
  };
}

interface Stats {
  balance: number;
  income: number;
  expenses: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    balance: 0,
    income: 0,
    expenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        loadData();
      }
    }, [session])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function loadData() {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);

      const { data: transactionData, error: transError } = await supabase
        .from('transactions')
        .select(
          `
          id,
          amount,
          description,
          date,
          type,
          categories (
            name,
            icon,
            color
          )
        `
        )
        .order('date', { ascending: false })
        .limit(5);

      if (transError) throw transError;

      setTransactions(transactionData as Transaction[]);

      const { data: allTransactions, error: statsError } = await supabase
        .from('transactions')
        .select('amount, type');

      if (statsError) throw statsError;

      const income = allTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expenses = allTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      setStats({
        balance: income - expenses,
        income,
        expenses,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Here's your financial overview</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Wallet size={24} color="#FFFFFF" />
          <Text style={styles.balanceLabel}>Total Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>
          ${stats.balance.toFixed(2)}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.incomeAmount}>${stats.income.toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TrendingDown size={16} color="#EF4444" />
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.expenseAmount}>
              ${stats.expenses.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/add')}>
              <Text style={styles.addButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: transaction.categories.color + '20' },
                ]}>
                <Text style={styles.iconText}>
                  {transaction.categories.icon}
                </Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionCategory}>
                  {transaction.categories.name}
                </Text>
                <Text style={styles.transactionDescription}>
                  {transaction.description || 'No description'}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'income'
                    ? styles.incomeText
                    : styles.expenseText,
                ]}>
                {transaction.type === 'income' ? '+' : '-'}$
                {parseFloat(transaction.amount).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
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
  },
  greeting: {
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
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  balanceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#DBEAFE',
    marginLeft: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#DBEAFE',
    opacity: 0.3,
  },
  statLabel: {
    fontSize: 14,
    color: '#DBEAFE',
    marginTop: 4,
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  incomeText: {
    color: '#10B981',
  },
  expenseText: {
    color: '#EF4444',
  },
});
