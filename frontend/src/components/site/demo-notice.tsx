import { Icon } from "@/components/ui/icon";

export function DemoNotice() {
  return (
    <div className="demo-notice" role="note">
      <div className="demo-notice__inner">
        <span className="demo-notice__label">
          <span className="demo-notice__dot" />
          DEVELOPMENT PREVIEW
        </span>
        <p>Example routes and fares only — no live availability or bookings.</p>
        <span className="demo-notice__trust">
          <Icon name="shield" size={16} />
          No payment is processed
        </span>
      </div>
    </div>
  );
}
