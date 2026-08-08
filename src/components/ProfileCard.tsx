type ProfileCardProps = {
  now: Date;
  weekday: string;
  dateStamp: string;
};

export function ProfileCard({ now, weekday, dateStamp }: ProfileCardProps) {
  return (
    <div className="clock-face">
      <div className="clock-headline">
        <strong>
          <DotMatrixText text={now.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })} variant="time" />
        </strong>
        <div className="onair-dot">ON AIR</div>
      </div>
      <div className="clock-meta">
        <span>{weekday}</span>
        <small>{dateStamp}</small>
      </div>
    </div>
  );
}
import { DotMatrixText } from "./DotMatrixText";
