import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Transaction {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  description: string;
}

interface TransactionTableProps {
  transactions: Transaction[] | null;
}

export const TransactionTable = ({ transactions }: TransactionTableProps) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'winnings':
      case 'bet_win':
        return '🏆';
      case 'bet':
      case 'bet_loss':
        return '📉';
      default:
        return '💸';
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    switch (type) {
      case 'deposit':
      case 'winnings':
      case 'bet_win':
        return 'text-green-500';
      case 'bet':
      case 'bet_loss':
        return 'text-red-500';
      default:
        return amount > 0 ? 'text-green-500' : 'text-red-500';
    }
  };

  const formatDescription = (type: string, description: string) => {
    if ((type === 'bet_win' || type === 'winnings') && description) {
      return description.startsWith('Won bet') ? description : `Won bet on ${description}`;
    }
    if ((type === 'bet_loss' || type === 'bet') && description) {
      return description.startsWith('Lost bet') ? description : `Bet placed on ${description}`;
    }
    return description;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions?.map(transaction => (
          <TableRow key={transaction.id}>
            <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="capitalize">
              <span className="mr-2">{getTransactionIcon(transaction.type)}</span>
              {transaction.type === 'winnings'
                ? 'Bet Win'
                : transaction.type === 'bet'
                  ? 'Bet Placed'
                  : transaction.type.replace('_', ' ')}
            </TableCell>
            <TableCell className={getTransactionColor(transaction.type, transaction.amount)}>
              {Math.abs(transaction.amount).toFixed(0)} Free Coins
            </TableCell>
            <TableCell>{formatDescription(transaction.type, transaction.description)}</TableCell>
          </TableRow>
        ))}
        {!transactions?.length && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No transactions found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
