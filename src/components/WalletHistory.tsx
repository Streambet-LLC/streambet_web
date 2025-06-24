import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { CircleDollarSign, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'bet_refunded' | 'admin';
  amount: number;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export function WalletHistory() {
  const {
    data: transactions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: async () => {
      const data = await api.wallet.getTransactions();
      return data;
    },
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdraw':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'bet_won':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bet_lost':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      default:
        return <CircleDollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Deposit
          </Badge>
        );
      case 'withdraw':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Withdraw
          </Badge>
        );
      case 'bet_placed':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Bet Placed
          </Badge>
        );
      case 'bet_won':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Bet Won
          </Badge>
        );
      case 'bet_lost':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Bet Lost
          </Badge>
        );
      case 'bet_refunded':
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          >
            Refunded
          </Badge>
        );
      case 'admin':
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-500 border-purple-500/20"
          >
            Admin
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatAmount = (type: string, amount: number) => {
    const isPositive =
      ['deposit', 'bet_won', 'bet_refunded'].includes(type) || (type === 'admin' && amount > 0);
    const prefix = isPositive ? '+' : '';
    return `${prefix}${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">
            There was an error loading your transaction history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent wallet activity</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions && transactions.length > 0 ? (
          <Table>
            <TableCaption>A list of your recent transactions.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction: Transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      {getTransactionBadge(transaction.type)}
                    </div>
                  </TableCell>
                  <TableCell>{transaction.description || 'No description'}</TableCell>
                  <TableCell>
                    {!!transaction.created_at && formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      ['deposit', 'bet_won', 'bet_refunded'].includes(transaction.type) ||
                      (transaction.type === 'admin' && transaction.amount > 0)
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    {formatAmount(transaction.type, transaction.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            No transactions found. Start using your wallet to see activity here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
