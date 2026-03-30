import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from 'lucide-react';

export default function RouteGroup({ auth, guard }: { auth?: boolean; guard?: boolean }) {
  const { session, isLoading, isFetching } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Show loading spinner while fetching session to prevent premature redirects
  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (guard && !session) {
    navigate(
      `/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`
    );
    return;
  }

  if (auth && session) {
    navigate('/');
    return;
  }

  return <Outlet />;
};