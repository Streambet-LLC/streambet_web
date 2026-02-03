import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface UserBetsChartProps {
  pickId: string;
  roundId?: string;
}

export const UserBetsChart = ({ pickId, roundId }: UserBetsChartProps) => {
  // Fetch timeline data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pick-timeline', roundId],
    queryFn: () => api.bets.getRoundPickTimeline(roundId!),
    enabled: !!roundId,
  });

  // Handle states - always show empty chart with "No picks yet"
  if (!roundId) {
    return <ChartStateCard message="No picks yet" />;
  }

  if (isLoading) {
    return <ChartStateCard message="Loading pick activity..." />;
  }

  if (isError || !data?.data?.timeline?.length) {
    return <ChartStateCard message="No picks yet" />;
  }

  // Process data for chart
  const { options, timeline } = data.data;
  const [optionA, optionB] = options;

  const chartData = timeline.map((point: any) => ({
    time: format(new Date(point.timestamp), 'h:mm a'),
    fullTime: format(new Date(point.timestamp), 'MMM d, h:mm a'),
    [optionA.name]: point[optionA.id],
    [optionB.name]: point[optionB.id],
    userCountA: point.userCountA,
    userCountB: point.userCountB,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const optionAValue = payload[0]?.value || 0;
    const optionBValue = payload[1]?.value || 0;
    const total = optionAValue + optionBValue;
    
    // Calculate ratio (simplified to nearest whole number)
    let ratio = '0:0';
    if (optionAValue > 0 && optionBValue > 0) {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(optionAValue, optionBValue);
      ratio = `${optionAValue / divisor}:${optionBValue / divisor}`;
    } else if (optionAValue > 0) {
      ratio = `${optionAValue}:0`;
    } else if (optionBValue > 0) {
      ratio = `0:${optionBValue}`;
    }

    const userCountA = payload[0]?.payload?.userCountA || 0;
    const userCountB = payload[0]?.payload?.userCountB || 0;

    return (
      <div className="bg-card-grid-bg border border-card-grid-border rounded-lg p-3 shadow-lg">
        <p className="text-sm text-muted-foreground mb-2">{payload[0]?.payload?.fullTime}</p>
        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: payload[0]?.color }}>
            {optionA.name}: {optionAValue.toLocaleString()} CadeCoins ({userCountA} users)
          </p>
          <p className="text-sm font-medium" style={{ color: payload[1]?.color }}>
            {optionB.name}: {optionBValue.toLocaleString()} CadeCoins ({userCountB} users)
          </p>
          <div className="border-t border-border pt-1 mt-1">
            <p className="text-sm text-muted-foreground">
              Ratio: {ratio}
            </p>
            <p className="text-sm text-muted-foreground">
              Total Pool: {total.toLocaleString()} CadeCoins
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6 bg-card-grid-bg border-card-grid-border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Pick Pool History</h3>
        <p className="text-sm text-muted-foreground">Cumulative CadeCoin amounts over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="time" 
            stroke="#888"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#888"
            style={{ fontSize: '12px' }}
            label={{ value: 'CadeCoins', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={optionA.name} 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={`${optionA.name} (${optionA.userCount} users)`}
          />
          <Line 
            type="monotone" 
            dataKey={optionB.name} 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={`${optionB.name} (${optionB.userCount} users)`}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// Helper component
const ChartStateCard = ({ message }: { message: string }) => (
  <Card className="p-6 bg-card-grid-bg border-card-grid-border">
    <div className="mb-4">
      <h3 className="text-lg font-semibold">Pick Pool History</h3>
      <p className="text-sm text-muted-foreground">Cumulative CadeCoin amounts over time</p>
    </div>
    <div className="h-[300px] flex items-center justify-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  </Card>
);
