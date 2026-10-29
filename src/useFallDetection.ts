import { useEffect, useRef, useState } from "react";
import { Accelerometer } from "expo-sensors";
import { FallDetector, Thresholds } from "./fallDetector";

const MAX_SAMPLES = 60; // chart: 60 x 200 ms = 12 s
const PEAK_SAMPLES = 50; // peak window: 50 x 200 ms = 10 s

export function useFallDetection(
  enabled: boolean,
  th: Thresholds,
  onFall: () => void
) {
  const [magnitude, setMagnitude] = useState(1);
  const [samples, setSamples] = useState<number[]>([]);
  const [peak, setPeak] = useState(1);
  const detector = useRef(new FallDetector(th));
  const callback = useRef(onFall);
  callback.current = onFall;

  useEffect(() => {
    detector.current.setThresholds(th);
  }, [th]);

  useEffect(() => {
    if (!enabled) return;
    detector.current.reset();
    Accelerometer.setUpdateInterval(50); // 20 samples per second
    let lastUi = 0;
    const buffer: number[] = [];
    const maxes: number[] = [];
    // A spike lasts only ~50 ms, so keep the most extreme sample between UI updates
    let tickExtreme = 1;
    let tickMax = 0;

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (Math.abs(mag - 1) > Math.abs(tickExtreme - 1)) tickExtreme = mag;
      if (mag > tickMax) tickMax = mag;

      if (now - lastUi > 200) {
        lastUi = now;
        buffer.push(tickExtreme);
        if (buffer.length > MAX_SAMPLES) buffer.shift();
        maxes.push(tickMax);
        if (maxes.length > PEAK_SAMPLES) maxes.shift();
        setMagnitude(mag);
        setSamples([...buffer]);
        setPeak(Math.max(...maxes));
        tickExtreme = 1;
        tickMax = 0;
      }

      if (detector.current.feed(mag, now)) callback.current();
    });

    return () => sub.remove();
  }, [enabled]);

  return { magnitude, samples, peak };
}
