import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { users } from '@/lib/mockData';

interface FilterBarProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  selectedUser: string;
  onUserChange: (userId: string) => void;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (group: 'day' | 'week' | 'month') => void;
  showUserFilter?: boolean;
}

const FilterBar = ({
  selectedPeriod,
  onPeriodChange,
  selectedUser,
  onUserChange,
  groupBy,
  onGroupByChange,
  showUserFilter = true,
}: FilterBarProps) => {
  const periods = [
    { value: '7', label: '7 Days' },
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '180', label: '180 Days' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex-1">
        <Tabs value={selectedPeriod} onValueChange={onPeriodChange}>
          <TabsList className="bg-secondary/50">
            {periods.map((period) => (
              <TabsTrigger 
                key={period.value} 
                value={period.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {period.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-3">
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as 'day' | 'week' | 'month')}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">By Day</SelectItem>
            <SelectItem value="week">By Week</SelectItem>
            <SelectItem value="month">By Month</SelectItem>
          </SelectContent>
        </Select>

        {showUserFilter && (
          <Select value={selectedUser} onValueChange={onUserChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.filter(u => u.role !== 'admin').map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
