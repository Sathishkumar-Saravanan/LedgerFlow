
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import DashboardLayout from "./Layouts/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import NewTransaction from "./pages/NewTransaction";
import SystemStatus from "./pages/SystemStatus";
import TransferMoney from "./pages/TransferMoney";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Dashboard Layout */}
        <Route path="/" element={<DashboardLayout />}>
          
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Accounts */}
          <Route path="accounts" element={<Accounts />} />

          {/* Transactions */}
          <Route path="transactions" element={<Transactions />} />

          {/* New Transaction */}
          <Route
            path="new-transaction"
            element={<NewTransaction />}
          />

          {/* System Status */}
          <Route
            path="system-status"
            element={<SystemStatus />}
          />

        </Route>
        <Route
  path="transfer-money"
  element={<TransferMoney />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
