import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

// Color palette for chart lines - cycles through if more options than colors
const CHART_COLORS = [
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

// Dimensions
const CHART_HEIGHT_MOBILE = 250;
const CHART_HEIGHT_DESKTOP = 300;
const CHART_EMPTY_STATE_HEIGHT = 300;

// Data sampling
const MAX_POINTS = 150;
const MAX_POINTS_FOR_DOTS = 100;

// Visual styling
const LINE_STROKE_WIDTH = 2;
const DOT_RADIUS = 2;
const ACTIVE_DOT_RADIUS = 4;
const GRID_STROKE_PATTERN = '3 3';
const GRID_STROKE_COLOR = '#333';
const AXIS_STROKE_COLOR = '#888';

// Responsive configuration
const FONT_SIZE_MOBILE = '10px';
const FONT_SIZE_DESKTOP = '12px';
const X_AXIS_MIN_TICK_GAP_MOBILE = 80;
const X_AXIS_MIN_TICK_GAP_DESKTOP = 50;
const Y_AXIS_WIDTH_MOBILE = 30;
const Y_AXIS_WIDTH_DESKTOP = 60;
const Y_AXIS_LABEL_ANGLE = -90;

// Formatting
const ODDS_DECIMAL_PLACES = 2;

interface TimelineOption {
  id: string;
  name: string;
  userCount: number;
}

interface TimelinePoint {
  timestamp: string;
  [key: string]: number | string; // Dynamic keys for option values and user counts
}

interface ChartDataPoint {
  time: string;
  fullTime: string;
  [key: string]: number | string; // Dynamic keys for option data
}

interface UserBetsChartProps {
  roundId?: string;
  roundName?: string;
}

// Sample data if too many points for performance
const sampleData = <T,>(data: T[], maxPoints: number): T[] => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  const sampled = data.filter((_, index) => index % step === 0);
  
  // Always include the last point to show final state
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  
  return sampled;
};

// Calculate odds: (total pool - option stake) / option stake, displayed as X:1
const calculateRatio = (optionValue: number, totalPool: number): string => {
  if (optionValue === 0) return 'No bets'; // Can't calculate odds with no stake
  if (totalPool === 0) return 'No bets';
  
  const odds = (totalPool - optionValue) / optionValue;
  return odds.toFixed(ODDS_DECIMAL_PLACES).replace(/\.?0+$/, '') + ':1'; // Format as X:1
};

export const UserBetsChart = ({ roundId, roundName }: UserBetsChartProps) => {
  const isMobile = useIsMobile();
  
  // Fetch timeline data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pick-timeline', roundId],
    queryFn: () => api.bets.getRoundPickTimeline(roundId!),
    enabled: !!roundId,
  });

  // Handle states
  if (!roundId) {
    return <ChartStateCard roundName={roundName} message="Chart will be available once a round opens" isMobile={isMobile} />;
  }

  if (isLoading) {
    return <ChartStateCard roundName={roundName} message="Loading pick activity..." isMobile={isMobile} />;
  }

  if (isError) {
    return <ChartStateCard roundName={roundName} message="Failed to load pick activity" isMobile={isMobile} />;
  }

  if (!data?.data?.timeline?.length) {
    return <ChartStateCard roundName={roundName} message="Be the first to place a pick!" isMobile={isMobile} />;
  }

  // Process data for chart
  const { options, timeline } = data.data;

  // Sort options alphabetically with natural numeric ordering
  const sortedOptions: TimelineOption[] = [...options].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  // Filter out options with no bets in the timeline
  const optionsWithBets = sortedOptions.filter((option: TimelineOption) => 
    timeline.some((point: TimelinePoint) => (point[option.id] as number) > 0)
  );

  const chartData: ChartDataPoint[] = timeline.map((point: TimelinePoint) => {
    const dataPoint: ChartDataPoint = {
      time: format(new Date(point.timestamp), 'h:mm a'),
      fullTime: format(new Date(point.timestamp), 'MMM d, h:mm a'),
    };
    
    // Dynamically add each option's data
    sortedOptions.forEach((option: TimelineOption) => {
      dataPoint[option.name] = point[option.id];
      dataPoint[`${option.id}_userCount`] = point[`userCount_${option.id}`] || 0;
    });
    
    return dataPoint;
  });

  const displayData = sampleData(chartData, MAX_POINTS);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    // Calculate total pool from all options
    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

    return (
      <div className="bg-card-grid-bg border border-card-grid-border rounded-lg p-3 shadow-lg">
        <p className="text-sm text-muted-foreground mb-2">{payload[0]?.payload?.fullTime}</p>
        <div className="space-y-2">
          {payload.map((item: any) => {
            const option = optionsWithBets.find((opt: TimelineOption) => opt.name === item.dataKey);
            if (!option) return null;
            const optionValue = item.value || 0;
            const userCount = item.payload[`${option.id}_userCount`] || 0;
            const ratio = calculateRatio(optionValue, total);

            return (
              <div key={option.id} className="space-y-0.5">
                <p className="text-sm font-medium" style={{ color: item.color }}>
                  {option.name}: {optionValue.toLocaleString()} CadeCoins ({userCount} users)
                </p>
                {ratio !== 'No bets' && (
                  <p className="text-xs text-muted-foreground pl-4">
                    Odds: {ratio}
                  </p>
                )}
              </div>
            );
          })}
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-sm text-muted-foreground">
              Total Pool: {total.toLocaleString()} CadeCoins
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`${isMobile ? 'p-2' : 'p-6'} bg-card-grid-bg border-card-grid-border`}>
      <div className="mb-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
          Pick Pool History{roundName ? ` - ${roundName}` : ''}
        </h3>
        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Cumulative CadeCoin amounts over time</p>
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? CHART_HEIGHT_MOBILE : CHART_HEIGHT_DESKTOP}>
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray={GRID_STROKE_PATTERN} stroke={GRID_STROKE_COLOR} />
          <XAxis 
            dataKey="time" 
            stroke={AXIS_STROKE_COLOR}
            style={{ fontSize: isMobile ? FONT_SIZE_MOBILE : FONT_SIZE_DESKTOP }}
            minTickGap={isMobile ? X_AXIS_MIN_TICK_GAP_MOBILE : X_AXIS_MIN_TICK_GAP_DESKTOP}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke={AXIS_STROKE_COLOR}
            style={{ fontSize: isMobile ? FONT_SIZE_MOBILE : FONT_SIZE_DESKTOP }}
            width={isMobile ? Y_AXIS_WIDTH_MOBILE : Y_AXIS_WIDTH_DESKTOP}
            label={isMobile ? undefined : { value: 'CadeCoins', angle: Y_AXIS_LABEL_ANGLE, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {!isMobile && <Legend />}
          {optionsWithBets.map((option: TimelineOption, index: number) => (
            <Line 
              key={option.id}
              type="monotone" 
              dataKey={option.name} 
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={LINE_STROKE_WIDTH}
              dot={displayData.length > MAX_POINTS_FOR_DOTS ? false : { r: DOT_RADIUS }}
              activeDot={{ r: ACTIVE_DOT_RADIUS }}
              name={`${option.name} (${option.userCount} users)`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

// Helper component
const ChartStateCard = ({ roundName, message, isMobile }: { roundName?: string; message: string; isMobile: boolean }) => (
  <Card className={`${isMobile ? 'p-2' : 'p-6'} bg-card-grid-bg border-card-grid-border`}>
    <div className="mb-4">
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
        Pick Pool History{roundName ? ` - ${roundName}` : ''}
      </h3>
      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Cumulative CadeCoin amounts over time</p>
    </div>
    <div className="flex items-center justify-center" style={{ height: CHART_EMPTY_STATE_HEIGHT }}>
      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{message}</p>
    </div>
  </Card>
);
