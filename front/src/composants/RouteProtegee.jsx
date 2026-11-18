import { Navigate } from "react-router-dom";
import { jeton } from "../auth";

export default function RouteProtegee({ children }) {
  return jeton() ? children : <Navigate to="/connexion" replace />;
}
