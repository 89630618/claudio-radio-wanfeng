import { AnimatedContent } from "../components/AnimatedContent";

function greeting(hour: number) {
  if (hour < 11) return "早上好";
  if (hour < 18) return "中午好";
  return "晚上好";
}

export function ShowcaseMessagePanel({ now }: { now: Date }) {
  return (
    <section className="chat-panel showcase-message-panel" aria-label="Claudio 展示留言">
      <div className="connected-line">Claudio Showcase</div>
      <div className="chat-log">
        <AnimatedContent className="chat-message-motion" distance={14} duration={0.38} initialOpacity={0} scale={0.985}>
          <article className="assistant featured chat-message">
            <span className="chat-avatar claudio-avatar" aria-hidden="true" />
            <div className="message-body"><small>Claudio</small><p>{greeting(now.getHours())}，DJ小王子</p></div>
          </article>
        </AnimatedContent>
        <AnimatedContent className="chat-message-motion" distance={14} duration={0.38} initialOpacity={0} scale={0.985}>
          <article className="user chat-message">
            <span className="chat-avatar user-avatar" aria-hidden="true" />
            <div className="message-body"><small>奶龙</small><p>{greeting(now.getHours())}，我是奶龙</p></div>
          </article>
        </AnimatedContent>
        <AnimatedContent className="chat-message-motion" distance={14} duration={0.38} initialOpacity={0} scale={0.985}>
          <article className="assistant chat-message">
            <span className="chat-avatar claudio-avatar" aria-hidden="true" />
            <div className="message-body"><small>Claudio</small><p>仅供产品展示，无法和晚风对话噢</p></div>
          </article>
        </AnimatedContent>
      </div>
      <div className="chat-form" aria-label="展示输入框">
        <input disabled placeholder="仅供展示，暂不支持输入" aria-label="仅供展示，暂不支持输入" />
      </div>
    </section>
  );
}
