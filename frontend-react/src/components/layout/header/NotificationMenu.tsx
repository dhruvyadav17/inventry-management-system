const notifications = [
  {
    icon: 'bi-activity',
    title: 'Activity tracking',
    text: 'Admin actions are being recorded.',
  },
  {
    icon: 'bi-shield-check',
    title: 'Access control',
    text: 'RBAC permissions are active.',
  },
];

export function NotificationMenu() {
  return (
    <div className="notification-menu">
      <button className="icon-btn notification-trigger" title="Notifications" aria-label="Notifications">
        <i className="bi bi-bell" />
        <span className="notification-dot" />
      </button>
      <div className="notification-dropdown">
        <div className="notification-head">
          <strong>Notifications</strong>
          <span>System</span>
        </div>
        {notifications.map((item) => (
          <div className="notification-item" key={item.title}>
            <i className={`bi ${item.icon}`} />
            <div>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
