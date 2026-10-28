
import { useCallback, useEffect, useState } from "react";
import { Activity, Server, Database, Clock, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import api from "../api/api";
import "./SystemStatus.css";

function SystemStatus() {
  const [status, setStatus] = useState({
    api: "checking",
    database: "unknown",
    responseTime: null,
    lastChecked: null,
    message: "",
  });

  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    setRefreshing(true);

    const start = performance.now();

    try {
      // api.baseURL is http://localhost:5000/api/v1
      // The health endpoint is at http://localhost:5000/health
      const healthUrl = new URL(
        "/health",
        api.defaults.baseURL
      ).toString();

      const response = await api.get(healthUrl);
      const responseTime = Math.round(performance.now() - start);

      const result = response.data;

      // Adjust these fields if your backend uses another format.
      const dbStatus =
        result.database ??
        result.db ??
        result.data?.database ??
        result.data?.db;

      const databaseConnected =
        dbStatus === "connected" ||
        dbStatus === "healthy" ||
        dbStatus === true;

      const databaseDisconnected =
        dbStatus === "disconnected" ||
        dbStatus === "unhealthy" ||
        dbStatus === false;

      setStatus({
        api: response.status >= 200 && response.status < 300
          ? "online"
          : "offline",
        database: databaseConnected
          ? "connected"
          : databaseDisconnected
            ? "disconnected"
            : "unknown",
        responseTime,
        lastChecked: new Date(),
        message: result.message || "Health endpoint responded successfully.",
      });
    } catch (error) {
      setStatus({
        api: "offline",
        database: "unknown",
        responseTime: null,
        lastChecked: new Date(),
        message:
          error.response?.data?.message ||
          error.message ||
          "Unable to connect to the backend.",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const apiOnline = status.api === "online";
  const databaseConnected = status.database === "connected";

  const getIcon = (condition) => {
    if (condition === "online" || condition === "connected") {
      return <CheckCircle2 size={19} />;
    }

    if (condition === "offline" || condition === "disconnected") {
      return <XCircle size={19} />;
    }

    return <AlertCircle size={19} />;
  };

  const getLabel = (condition) => {
    const labels = {
      online: "Operational",
      offline: "Unavailable",
      connected: "Connected",
      disconnected: "Disconnected",
      checking: "Checking...",
      unknown: "Unknown",
    };

    return labels[condition] || "Unknown";
  };

  return (
    <div className="system-status-page">
      <div className="system-status-header">
        <div>
          <span className="system-status-eyebrow">
            MONITORING / INFRASTRUCTURE
          </span>

          <h1>System Status</h1>

          <p>
            Monitor LedgerFlow API availability and database connectivity.
          </p>
        </div>

        <button
          type="button"
          className="status-refresh-btn"
          onClick={checkStatus}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "status-spin" : ""}
          />
          {refreshing ? "Checking..." : "Refresh Status"}
        </button>
      </div>

      <div className="status-overview">
        <div className="status-overview-icon">
          <Activity size={25} />
        </div>

        <div>
          <h2>
            {status.api === "checking"
              ? "Checking system..."
              : apiOnline
                ? " nitoring active"
                : "System connection issue"}
          </h2>

          <p>
            {status.api === "checking"
              ? "Contacting the backend health endpoint."
              : apiOnline
                ? "The backend health endpoint is responding."
                : "The backend health endpoint could not be reached."}
          </p>
        </div>

        <span
          className={`status-indicator ${
            apiOnline ? "status-good" : "status-warning"
          }`}
        >
          <span className="status-dot" />
          {status.api === "checking"
            ? "Checking"
            : apiOnline
              ? "Online"
              : "Issue detected"}
        </span>
      </div>

      <div className="status-metrics-grid">
        <StatusCard
          icon={<Server size={21} />}
          title="Backend API"
          value={getLabel(status.api)}
          condition={status.api}
          getIcon={getIcon}
        />

        <StatusCard
          icon={<Database size={21} />}
          title="MongoDB"
          value={getLabel(status.database)}
          condition={status.database}
          getIcon={getIcon}
        />

        <StatusCard
          icon={<Activity size={21} />}
          title="API Response Time"
          value={
            status.responseTime !== null
              ? `${status.responseTime} ms`
              : "--"
          }
          neutral
        />

        <StatusCard
          icon={<Clock size={21} />}
          title="Last Checked"
          value={
            status.lastChecked
              ? status.lastChecked.toLocaleTimeString("en-IN")
              : "--"
          }
          neutral
        />
      </div>

      <div className="status-details-card">
        <div className="status-section-heading">
          <div>
            <h2>Service Details</h2>
            <p>Current connectivity checks</p>
          </div>

          <Activity size={21} />
        </div>

        <div className="status-service-row">
          <div className="status-service-icon">
            <Server size={20} />
          </div>

          <div className="status-service-info">
            <h3>LedgerFlow Backend</h3>
            <p>GET /health</p>
          </div>

          <span
            className={`status-badge ${
              status.api === "online"
                ? "status-badge-good"
                : status.api === "checking"
                  ? "status-badge-pending"
                  : "status-badge-error"
            }`}
          >
            {getIcon(status.api)}
            {getLabel(status.api)}
          </span>
        </div>

        <div className="status-service-row">
          <div className="status-service-icon">
            <Database size={20} />
          </div>

          <div className="status-service-info">
            <h3>MongoDB Database</h3>
            <p>Database connection health</p>
          </div>

          <span
            className={`status-badge ${
              status.database === "connected"
                ? "status-badge-good"
                : status.database === "unknown"
                  ? "status-badge-pending"
                  : "status-badge-error"
            }`}
          >
            {getIcon(status.database)}
            {getLabel(status.database)}
          </span>
        </div>

        <div className="status-note">
          <AlertCircle size={18} />
          <p>{status.message || "Waiting for health check..."}</p>
        </div>
      </div>

      <div className="status-footer">
        <span>
          Environment: <strong>Local Development</strong>
        </span>

        <span>
          Monitoring: <strong>Manual / On page load</strong>
        </span>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, value, condition, getIcon, neutral }) {
  return (
    <div className="status-metric-card">
      <div className="status-metric-top">
        <span className="status-metric-icon">{icon}</span>

        {neutral ? (
          <span className="status-neutral-dot" />
        ) : (
          <span
            className={`status-card-condition ${
              condition === "online" || condition === "connected"
                ? "status-card-good"
                : condition === "checking" || condition === "unknown"
                  ? "status-card-pending"
                  : "status-card-error"
            }`}
          >
            {getIcon(condition)}
          </span>
        )}
      </div>

      <p className="status-metric-title">{title}</p>
      <h3 className="status-metric-value">{value}</h3>
    </div>
  );
}

export default SystemStatus;
