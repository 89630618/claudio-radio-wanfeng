import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useRef } from "react";

type ElasticVolumeSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

const MAX_OVERFLOW = 34;

export function ElasticVolumeSlider({ value, onChange }: ElasticVolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);
  const trackScaleX = useTransform(overflow, [0, MAX_OVERFLOW], [1, 1.22]);
  const trackScaleY = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.62]);
  const percent = Math.round(value * 100);

  function commitPointer(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const { left, right, width } = track.getBoundingClientRect();
    const raw = (clientX - left) / width;
    onChange(Math.min(1, Math.max(0, raw)));
    overflow.set(Math.min(MAX_OVERFLOW, Math.max(0, left - clientX, clientX - right)));
  }

  function release() {
    animate(overflow, 0, { type: "spring", stiffness: 360, damping: 22, bounce: 0.22 });
  }

  return (
    <motion.label
      className="volume-row elastic-volume"
      style={{ scale }}
      onHoverStart={() => animate(scale, 1.05, { duration: 0.16 })}
      onHoverEnd={() => animate(scale, 1, { duration: 0.2 })}
    >
      <span>VOL</span>
      <div
        className="elastic-volume__root"
        ref={trackRef}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          commitPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0) commitPointer(event.clientX);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <motion.div className="elastic-volume__track" style={{ scaleX: trackScaleX, scaleY: trackScaleY }}>
          <div className="elastic-volume__fill" style={{ width: `${percent}%` }} />
        </motion.div>
        <input
          aria-label="Volume"
          className="elastic-volume__input"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          tabIndex={0}
        />
      </div>
    </motion.label>
  );
}
