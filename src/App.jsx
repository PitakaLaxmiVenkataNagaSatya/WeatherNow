import { useEffect, useState } from "react";

const GEOCODE_URL = (q) =>
  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q
  )}&count=1&language=en&format=json`;
const WEATHER_URL = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum&timezone=auto`;

const codeToText = (code) => {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    95: "Thunderstorm",
  };
  return map[code] ?? `Code ${code}`;
};

const codeToIcon = (code) => {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 61].includes(code)) return "🌦️";
  if ([63, 65].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if (code === 95) return "⛈️";
  return "🌡️";
};

export default function App() {
  const [query, setQuery] = useState("New York");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [place, setPlace] = useState(null);
  const [current, setCurrent] = useState(null);
  const [daily, setDaily] = useState(null);
  const [theme, setTheme] = useState("theme-dark");

  // Load stored theme or system preference
  useEffect(() => {
    const stored = localStorage.getItem("wx-theme");
    if (stored === "theme-light" || stored === "theme-dark") {
      setTheme(stored);
    } else if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      setTheme("theme-light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("wx-theme", theme);
  }, [theme]);

  const fetchWeather = async (q) => {
    if (!q?.trim()) return;
    setError("");
    setLoading(true);
    try {
      const geoRes = await fetch(GEOCODE_URL(q));
      if (!geoRes.ok) throw new Error("Geocoding failed");
      const geo = await geoRes.json();
      const first = geo?.results?.[0];
      if (!first) throw new Error("Location not found");

      const { latitude, longitude, name, country, timezone } = first;
      setPlace({ name, country, latitude, longitude, timezone });

      const wxRes = await fetch(WEATHER_URL(latitude, longitude));
      if (!wxRes.ok) throw new Error("Weather fetch failed");
      const wx = await wxRes.json();

      setCurrent(wx.current);
      setDaily(wx.daily);
    } catch (e) {
      setError(e.message || "Something went wrong");
      setCurrent(null);
      setDaily(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchWeather(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setPlace({ name: "Your location", country: "", latitude, longitude });
          const wxRes = await fetch(WEATHER_URL(latitude, longitude));
          if (!wxRes.ok) throw new Error("Weather fetch failed");
          const wx = await wxRes.json();
          setCurrent(wx.current);
          setDaily(wx.daily);
        } catch (e) {
          setError(e.message || "Failed to fetch weather");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Failed to get location");
      }
    );
  };

  return (
    <div className="wx-app">
      <header className="wx-header">
        <div>
          <h1 className="wx-title">Weather</h1>
          <p className="wx-subtitle">Search a city or use your location.</p>
        </div>
        <div className="wx-header-actions">
          <button
            type="button"
            className="wx-btn small ghost"
            onClick={() =>
              setTheme(theme === "theme-dark" ? "theme-light" : "theme-dark")
            }
            aria-label="Toggle light/dark theme"
          >
            {theme === "theme-dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <form
        className="wx-search"
        onSubmit={(e) => {
          e.preventDefault();
          fetchWeather(query);
        }}
      >
        <input
          className="wx-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. London"
          aria-label="City name"
        />
        <button className="wx-btn" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
        <button
          className="wx-btn secondary"
          type="button"
          onClick={tryGeolocate}
          disabled={loading}
        >
          Use location
        </button>
      </form>

      {error && (
        <div role="alert" className="wx-alert">
          {error}
        </div>
      )}

      {place && current && (
        <section className="wx-card">
          <div className="wx-place">
            <h2 className="wx-place-name">
              {place.name}
              {place.country ? `, ${place.country}` : ""}
            </h2>
            <div className="wx-timezone">{place.timezone}</div>
          </div>

          <div className="wx-current">
            <div className="wx-current-left">
              <div className="wx-icon" aria-hidden>
                {codeToIcon(current.weather_code)}
              </div>
              <div className="wx-temp">
                {Math.round(current.temperature_2m)}°
              </div>
            </div>
            <div className="wx-current-right">
              <div className="wx-condition">
                {codeToText(current.weather_code)}
              </div>
              <div className="wx-meta">
                Feels {Math.round(current.apparent_temperature)}° · Humidity{" "}
                {current.relative_humidity_2m}% · Wind{" "}
                {Math.round(current.wind_speed_10m)} km/h
              </div>
            </div>
          </div>

          {daily && (
            <div className="wx-forecast">
              <h3 className="wx-section-title">Next days</h3>
              <div className="wx-grid">
                {daily.time?.map((d, i) => {
                  const code = daily.weather_code?.[i];
                  const max = Math.round(daily.temperature_2m_max?.[i]);
                  const min = Math.round(daily.temperature_2m_min?.[i]);
                  const dateStr = new Date(d).toLocaleDateString();
                  return (
                    <div key={d} className={`wx-grid-item wx-code-${code}`}>
                      <div className="wx-grid-top">
                        <span className="wx-grid-date">{dateStr}</span>
                        <span className="wx-grid-icon" aria-hidden>
                          {codeToIcon(code)}
                        </span>
                      </div>
                      <div className="wx-grid-text">{codeToText(code)}</div>
                      <div className="wx-grid-temps">
                        <strong>{max}°</strong>
                        <span> / {min}°</span>
                      </div>
                      <div className="wx-grid-bar" aria-hidden>
                        <span style={{ width: "100%" }}>
                          <span
                            className="wx-bar-max"
                            style={{ width: "100%" }}
                          />
                          <span
                            className="wx-bar-min"
                            style={{
                              width: `${Math.max(
                                5,
                                (min / (max || 1)) * 100
                              )}%`,
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
