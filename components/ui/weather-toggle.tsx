"use client";

import { useEffect, useState } from "react";
import { useModKey } from "@/components/ui/kbd";

type Weather = "sun" | "rain" | "snow" | "aurora" | "meteor";

const WEATHER_KEY = "site-weather";

const WEATHER_ORDER: Weather[] = ["sun", "rain", "snow", "aurora", "meteor"];

const WEATHER_META: Record<Weather, { label: string; icon: string }> = {
  sun: { label: "Sun", icon: "\u2600" },
  rain: { label: "Rain", icon: "\u2602" },
  snow: { label: "Snow", icon: "\u2744" },
  aurora: { label: "Aurora", icon: "\u2736" },
  meteor: { label: "Meteor", icon: "\u2604" },
};

function getInitialWeather(): Weather {
  const savedWeather = localStorage.getItem(WEATHER_KEY);
  if (
    savedWeather === "sun" ||
    savedWeather === "rain" ||
    savedWeather === "snow" ||
    savedWeather === "aurora" ||
    savedWeather === "meteor"
  ) {
    return savedWeather;
  }

  return "sun";
}

function setWeatherOnDocument(weather: Weather) {
  document.documentElement.dataset.weather = weather;
}

function getNextWeather(current: Weather): Weather {
  const currentIndex = WEATHER_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % WEATHER_ORDER.length;
  return WEATHER_ORDER[nextIndex];
}

function isWeatherShortcut(e: KeyboardEvent) {
  const hasMod = e.metaKey || e.ctrlKey;
  const underscorePressed = e.key === "_" || (e.key === "-" && e.shiftKey);
  return hasMod && underscorePressed;
}

export function WeatherToggle() {
  const [weather, setWeather] = useState<Weather>(() => {
    if (typeof window === "undefined") {
      return "sun";
    }

    const docWeather = document.documentElement.dataset.weather;
    if (
      docWeather === "sun" ||
      docWeather === "rain" ||
      docWeather === "snow" ||
      docWeather === "aurora" ||
      docWeather === "meteor"
    ) {
      return docWeather;
    }

    return getInitialWeather();
  });
  const mod = useModKey();

  function handleToggle() {
    setWeather((current) => {
      const nextWeather = getNextWeather(current);
      setWeatherOnDocument(nextWeather);
      localStorage.setItem(WEATHER_KEY, nextWeather);
      return nextWeather;
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isWeatherShortcut(e)) {
        return;
      }

      e.preventDefault();
      setWeather((current) => {
        const nextWeather = getNextWeather(current);
        setWeatherOnDocument(nextWeather);
        localStorage.setItem(WEATHER_KEY, nextWeather);
        return nextWeather;
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeWeather = WEATHER_META[weather];

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="text-foreground"
      aria-label={`Cycle weather (${mod}_)`}
      title={`Cycle weather (${mod}_)`}
    >
      <span suppressHydrationWarning>{activeWeather.icon}</span>
    </button>
  );
}
