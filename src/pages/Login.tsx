import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logoBlue from '@/assets/rr_logo_blue.webp';

const Login = () => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const success = login(name.trim());
    
    if (success) {
      toast.success('Welcome back!', {
        description: `Logged in as ${name}`,
      });
      navigate('/');
    } else {
      toast.error('Invalid credentials', {
        description: 'User not found. Please check your name.',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/50 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <div className="gradient-primary p-8 flex items-center justify-center">
            <img 
              src={logoBlue} 
              alt="Rent and Recruit" 
              className="h-16 w-auto brightness-0 invert"
            />
          </div>
          <CardHeader className="text-center pt-8">
            <CardTitle className="text-2xl font-display">KPI Tracker</CardTitle>
            <CardDescription className="text-base">
              Sign in to access your performance dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Your Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 text-base"
                  autoFocus
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Available users: <span className="font-medium">Amber Suarez</span>,{' '}
                <span className="font-medium">Janet Dickinson</span>,{' '}
                <span className="font-medium">Admin</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
