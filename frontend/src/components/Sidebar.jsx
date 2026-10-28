
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PlusCircle,
  Activity,
  Landmark,
  X,
} from "lucide-react";

import "./Sidebar.css";

const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Accounts",
    path: "/accounts",
    icon: Wallet,
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "New Transaction",
    path: "/new-transaction",
    icon: PlusCircle,
  },
  {
    label: "Transfer Money",
    path: "/transfer-money",
    icon: ArrowLeftRight,
  },
  {
    label: "System Status",
    path: "/system-status",
    icon: Activity,
  },
];

function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Landmark size={24} />
          </div>

          <div className="sidebar-brand-text">
            <h2>LedgerFlow</h2>
            <span>Transaction Ledger</span>
          </div>

          <button
            className="sidebar-mobile-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">
          WORKSPACE
        </div>

        <nav className="sidebar-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} strokeWidth={1.9} />

                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <div className="sidebar-footer-icon">
              <Landmark size={19} />
            </div>

            <div>
              <strong>LedgerFlow</strong>
              <span>Financial workspace</span>
            </div>
          </div>

          <p className="sidebar-copyright">
            LedgerFlow © 2026
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
