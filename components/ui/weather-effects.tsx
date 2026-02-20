type RainDrop = {
  left: string;
  delay: string;
  duration: string;
  opacity: number;
};

type SnowFlake = {
  left: string;
  delay: string;
  duration: string;
  fontSize: number;
  opacity: number;
};

type Meteor = {
  left: string;
  top: string;
  delay: string;
  duration: string;
  length: number;
  opacity: number;
};

const RAIN_DROPS: RainDrop[] = Array.from({ length: 54 }, (_, index) => ({
  left: `${((index * 13.7) % 100).toFixed(2)}%`,
  delay: `${((index * 0.19) % 2.4).toFixed(2)}s`,
  duration: `${(1 + (index % 5) * 0.14).toFixed(2)}s`,
  opacity: 0.24 + (index % 4) * 0.11,
}));

const SNOW_FLAKES: SnowFlake[] = Array.from({ length: 40 }, (_, index) => ({
  // Deterministic pseudo-random for stable SSR/CSR rendering.
  // Range ~7px-25.5px (higher variance), average ~16.25px (~25% above prior ~13px).
  ...(() => {
    const seed = Math.sin((index + 1) * 97.13) * 10000;
    const rand = seed - Math.floor(seed);
    return { fontSize: 7 + rand * 18.5 };
  })(),
  left: `${((index * 9.3) % 100).toFixed(2)}%`,
  delay: `${((index * 0.53) % 12).toFixed(2)}s`,
  duration: `${(12 + (index % 8) * 1.4).toFixed(2)}s`,
  opacity: 0.35 + (index % 5) * 0.1,
}));

const METEORS: Meteor[] = Array.from({ length: 10 }, (_, index) => ({
  left: `${((index * 17.8) % 120 - 10).toFixed(2)}%`,
  top: `${((index * 5.4) % 24).toFixed(2)}%`,
  delay: `${((index * 2.73) % 24).toFixed(2)}s`,
  duration: `${(1.35 + (index % 4) * 0.22).toFixed(2)}s`,
  length: 80 + (index % 6) * 24,
  opacity: 0.3 + (index % 4) * 0.13,
}));

export function WeatherEffects() {
  return (
    <div className="weather-effects" aria-hidden="true">
      <div className="weather-rain-layer">
        {RAIN_DROPS.map((drop, index) => (
          <span
            key={`rain-${index}`}
            className="weather-rain-drop"
            style={{
              left: drop.left,
              animationDelay: `-${drop.delay}`,
              animationDuration: drop.duration,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>
      <div className="weather-snow-layer">
        {SNOW_FLAKES.map((flake, index) => (
          <span
            key={`snow-${index}`}
            className="weather-snow-flake"
            style={{
              left: flake.left,
              fontSize: `${flake.fontSize}px`,
              animationDelay: `-${flake.delay}`,
              animationDuration: flake.duration,
              opacity: flake.opacity,
            }}
          >
            {"\u2744"}
          </span>
        ))}
      </div>
      <div className="weather-meteor-layer">
        {METEORS.map((meteor, index) => (
          <span
            key={`meteor-${index}`}
            className="weather-meteor"
            style={{
              left: meteor.left,
              top: meteor.top,
              width: `${meteor.length}px`,
              animationDelay: `-${meteor.delay}`,
              animationDuration: meteor.duration,
              opacity: meteor.opacity,
            }}
          />
        ))}
      </div>
      <div className="weather-aurora-layer">
        <span className="weather-aurora-field weather-aurora-field-a" />
        <span className="weather-aurora-field weather-aurora-field-b" />
        <span className="weather-aurora-curtain" />
        <span className="weather-aurora-vignette" />
      </div>
    </div>
  );
}
