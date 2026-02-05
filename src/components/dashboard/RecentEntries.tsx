import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPIEntry, users } from '@/lib/mockData';
import { format } from 'date-fns';
import { Phone, Calendar, CheckCircle, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RecentEntriesProps {
  entries: KPIEntry[];
  showUser?: boolean;
}

const RecentEntries = ({ entries, showUser = true }: RecentEntriesProps) => {
  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  return (
    <Card className="animate-slide-in-right">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Recent Entries
          <Badge variant="secondary" className="font-normal">
            Last {entries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-foreground">
                    {format(new Date(entry.date.length === 10 ? `${entry.date}T00:00:00` : entry.date), 'MMM d, yyyy')}
                  </span>
                  {showUser && (
                    <Badge variant="outline" className="text-xs">
                      {getUserName(entry.userId)}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{entry.callsMade}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Calls Made</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{entry.meetingsSet}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Meetings Set</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{entry.meetingsCompleted}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Meetings Completed</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                        <Target className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{entry.closes}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Closes</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Close Rate</p>
                <p className="font-bold text-primary">{entry.reqCloseRate}%</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentEntries;
