import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { users } from '@/lib/mockData';
import { Shield, User as UserIcon } from 'lucide-react';

const Users = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            User Management
          </h1>
          <p className="text-muted-foreground">
            View and manage system users
          </p>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id} className="animate-fade-in kpi-card-hover">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className={
                      user.role === 'admin' 
                        ? 'bg-primary text-primary-foreground text-lg font-semibold'
                        : 'bg-secondary text-secondary-foreground text-lg font-semibold'
                    }>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="h-3.5 w-3.5" />
                          Administrator
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-3.5 w-3.5" />
                          Team Member
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge 
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className={user.role === 'admin' ? 'gradient-primary' : ''}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-secondary/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              User management features will be fully available when connected to Supabase.
              Currently displaying mock data.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Users;
