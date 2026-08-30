import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();

  const {user,logout} = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>

      <p>
        You are successfully logged into Barter Trade.
      </p>

      <div>
        <p>
          <strong>Email:</strong>{" "}
          {user.email}
        </p>

        <p>
          <strong>Role:</strong>{" "}
          {user.role}
        </p>

        <p>
          <strong>Barter Score:</strong>{" "}
          {user.barterScore}
        </p>

        <p>
          <strong>Completed Trades:</strong>{" "}
          {user.completedTrades}
        </p>
      </div>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Dashboard;