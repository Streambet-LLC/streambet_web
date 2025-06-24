import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Home, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 pt-24 pb-8">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* 404 Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <AlertTriangle className="h-32 w-32 text-muted-foreground/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-[#BDFF00]">404</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Page Not Found
            </h1>
            <p className="text-xl text-[#FFFFFFBF] max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist. 
              It might have been in development, moved or deleted.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => navigate('/')}
              size="lg"
              className="bg-[#BDFF00] text-black hover:bg-[#BDFF00]/90 font-semibold"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              size="lg"
            >
              Go Back
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound; 
