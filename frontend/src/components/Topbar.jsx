
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  X,
  CheckCheck,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import "./Topbar.css";

const pages = [
  { title: "Dashboard", path: "/" },
  { title: "Accounts", path: "/accounts" },
  { title: "Transactions", path: "/transactions" },
  { title: "New Transaction", path: "/new-transaction" },
  { title: "System Status", path: "/system-status" },
];

const STORAGE_KEY = "ledgerflowNotifications";
const NOTIFICATION_EVENT = "ledgerflow-notifications-updated";

const readNotifications = () => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notifications, setNotifications] = useState(
    readNotifications
  );

  const searchRef = useRef(null);
  const searchContainerRef = useRef(null);
  const notificationRef = useRef(null);

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(
      query.trim().toLowerCase()
    )
  );

  // Keep notification state synced with browser storage
  useEffect(() => {
    const syncNotifications = () => {
      setNotifications(readNotifications());
    };

    window.addEventListener(
      NOTIFICATION_EVENT,
      syncNotifications
    );

    window.addEventListener("storage", syncNotifications);

    return () => {
      window.removeEventListener(
        NOTIFICATION_EVENT,
        syncNotifications
      );

      window.removeEventListener(
        "storage",
        syncNotifications
      );
    };
  }, []);

  // Close popups on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // Close popups after route change
  useEffect(() => {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setQuery("");
  }, [location.pathname]);

  // Focus search input
  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    }
  }, [searchOpen]);

  const openPage = (path) => {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setQuery("");
    navigate(path);
  };

  // Mark all notifications read
  const markAllRead = () => {
    const updated = notifications.map((item) => ({
      ...item,
      read: true,
    }));

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );

    setNotifications(updated);

    window.dispatchEvent(
      new Event(NOTIFICATION_EVENT)
    );
  };

  // Mark one notification read
  const markOneRead = (id) => {
    const updated = notifications.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );

    setNotifications(updated);

    window.dispatchEvent(
      new Event(NOTIFICATION_EVENT)
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    setNotifications([]);

    window.dispatchEvent(
      new Event(NOTIFICATION_EVENT)
    );
  };

  const formatTime = (time) => {
    if (!time) return "Recent";

    const date = new Date(time);

    if (Number.isNaN(date.getTime())) {
      return "Recent";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <header className="ledger-topbar">
      <div className="topbar-heading">
        <h1>Dashboard</h1>
        <p>Overview of your transaction ledger</p>
      </div>

      <div className="topbar-actions">
        <div className="workspace-pill">
          <span className="workspace-dot" />
          <span>Ledger Workspace</span>
        </div>

        {/* SEARCH */}
        <div
          className="topbar-popup-wrapper"
          ref={searchContainerRef}
        >
          <button
            type="button"
            className={`topbar-icon-btn ${
              searchOpen ? "topbar-btn-active" : ""
            }`}
            aria-label="Search pages"
            aria-expanded={searchOpen}
            title="Search"
            onClick={() => {
              setSearchOpen((previous) => !previous);
              setNotificationsOpen(false);
              setQuery("");
            }}
          >
            {searchOpen ? (
              <X size={21} />
            ) : (
              <Search size={22} />
            )}
          </button>

          {searchOpen && (
            <div className="topbar-popup search-popup">
              <div className="popup-heading">
                <h3>Search LedgerFlow</h3>
              </div>

              <div className="search-input-wrapper">
                <Search size={18} />

                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search pages..."
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSearchOpen(false);
                    }

                    if (
                      event.key === "Enter" &&
                      filteredPages.length > 0
                    ) {
                      openPage(filteredPages[0].path);
                    }
                  }}
                />
              </div>

              <p className="popup-caption">PAGES</p>

              <div className="search-results">
                {filteredPages.length > 0 ? (
                  filteredPages.map((page) => (
                    <button
                      type="button"
                      className="search-result-item"
                      key={page.path}
                      onClick={() => openPage(page.path)}
                    >
                      <span>{page.title}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))
                ) : (
                  <p className="popup-empty">
                    No matching pages found.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div
          className="topbar-popup-wrapper"
          ref={notificationRef}
        >
          <button
            type="button"
            className={`topbar-icon-btn ${
              notificationsOpen ? "topbar-btn-active" : ""
            }`}
            aria-label={`Notifications: ${unreadCount} unread`}
            aria-expanded={notificationsOpen}
            title="Notifications"
            onClick={() => {
              setNotificationsOpen(
                (previous) => !previous
              );

              setSearchOpen(false);
            }}
          >
            <Bell size={21} />

            {unreadCount > 0 && (
              <span className="notification-count">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="topbar-popup notification-popup">
              <div className="notification-header">
                <div>
                  <h3>Notifications</h3>
                  <p>{unreadCount} unread</p>
                </div>

                <button
                  type="button"
                  className="popup-small-btn"
                  title="Mark all as read"
                  aria-label="Mark all as read"
                  disabled={unreadCount === 0}
                  onClick={markAllRead}
                >
                  <CheckCheck size={18} />
                </button>
              </div>

              <div className="notification-list">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`notification-item ${
                        item.read
                          ? "notification-read"
                          : ""
                      }`}
                      onClick={() => {
                        markOneRead(item.id);

                        if (item.path) {
                          openPage(item.path);
                        }
                      }}
                    >
                      <span className="notification-icon">
                        <CircleDot size={18} />
                      </span>

                      <span className="notification-content">
                        <strong>{item.title}</strong>
                        <span>{item.message}</span>
                        <small>
                          {formatTime(item.time)}
                        </small>
                      </span>

                      {!item.read && (
                        <span className="notification-unread-dot" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="notification-empty">
                    <Bell size={25} />
                    <strong>
                      You're all caught up
                    </strong>
                    <span>
                      No notifications available.
                    </span>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="notification-footer">
                  <button
                    type="button"
                    onClick={clearNotifications}
                  >
                    Clear notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
