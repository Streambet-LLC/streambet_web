import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export default function RouteGroup({
  auth,
  guard,
} : {
  auth?: boolean;
  guard?: boolean;
}) {
  const { session } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (guard && !session) {
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
    return;
  }

  if (auth && session) {
    navigate("/");
    return;
  }

  return (
    <Outlet />
  )
};