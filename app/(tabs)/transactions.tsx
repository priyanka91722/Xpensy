import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Trash2, ListFilter as Filter } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
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

export default function TransactionsScreen() {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        loadTransactions();
      }
    }, [session])
  );

  useEffect(() => {
    filterTransactions();
  }, [filter, transactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
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
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setTransactions(data as Transaction[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load transactions'
      );
    } finally {
      setLoading(false);
    }
  }

  function filterTransactions() {
    if (filter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter((t) => t.type === filter)
      );
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setTransactions(transactions.filter((t) => t.id !== id));
              Alert.alert('Success', 'Transaction deleted successfully');
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error
                  ? err.message
                  : 'Failed to delete transaction'
              );
            }
          },
        },
      ]
    );
  }

  function groupTransactionsByDate(transactions: Transaction[]) {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;

      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });

    return grouped;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          {filteredTransactions.length} transaction
          {filteredTransactions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('all')}>
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'expense' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('expense')}>
          <Text
            style={[
              styles.filterButtonText,
              filter === 'expense' && styles.filterButtonTextActive,
            ]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'income' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('income')}>
          <Text
            style={[
              styles.filterButtonText,
              filter === 'income' && styles.filterButtonTextActive,
            ]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={loadTransactions}
            style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Start by adding a transaction'
                : `No ${filter} transactions yet`}
            </Text>
          </View>
        ) : (
          Object.entries(groupedTransactions).map(([date, items]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {items.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: transaction.categories.color + '20',
                      },
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
                  </View>
                  <View style={styles.rightContainer}>
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
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(transaction.id)}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
  scrollView: {
    flex: 1,
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
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    paddingHorizontal: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
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
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  incomeText: {
    color: '#10B981',
  },
  expenseText: {
    color: '#EF4444',
  },
  deleteButton: {
    padding: 4,
  },
});
