import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function isAdminUser() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    return jwtDecode(token).esAdmin === true;
  } catch {
    return false;
  }
}

const RequireAdmin = ({ children }) => {
  if (!isAdminUser()) {
    return <Navigate to="/home" replace />;
  }
  return children;
};

export default RequireAdmin;
