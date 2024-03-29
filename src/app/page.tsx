"use client";

import Navbar from "./components/Navbar";
import { useQuery } from "react-query";
import axios from "axios";
import { formatDate, fromUnixTime, parseISO } from "date-fns";
import Container from "./components/Container";
import WeatherIcon from "./components/WeatherIcon";
import { getDayOrNightIcon } from "@/utils/getDayOrNightIcon";
import WeatherDetails from "./components/WeatherDetails";
import metersToKilometers from "@/utils/metersToKilometers";
import { off } from "process";
import ForecastPanel from "./components/ForecastPanel";
import { useAtom } from "jotai";
import { placeAtom } from "@/app/atom";
import { useEffect } from "react";
import { loadingCityAtom } from "@/app/atom";

// Current weather for Melbourne (lat/long)
// https://api.openweathermap.org/data/2.5/weather?lat=-37.813629&lon=144.963058&units=metric&appid=process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY

// 3hour/5day forecast for Melbourne (lat/long)
// https://api.openweathermap.org/data/2.5/forecast?lat=-37.813629&lon=144.963058&units=metric&appid=process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY

/**
 * Represents the weather data returned from the API.
 */
type WeatherData = {
  cod: string;
  message: number;
  cnt: number;
  list: WeatherEntry[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
};

/**
 * Represents a single weather entry in the 5-day forecast.
 */
type WeatherEntry = {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level: number;
    grnd_level: number;
    humidity: number;
    temp_kf: number;
  };
  weather: WeatherCondition[];
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust: number;
  };
  visibility: number;
  pop: number;
  sys: {
    pod: string;
  };
  dt_txt: string;
};

/**
 * Represents a single weather condition.
 */
type WeatherCondition = {
  id: number;
  main: string;
  description: string;
  icon: string;
};

export default function Home() {
  const [place, setPlace] = useAtom(placeAtom);
  const [loadingCity, setLoadingCity] = useAtom(loadingCityAtom);

  const { isLoading, error, data, refetch } = useQuery<WeatherData>(
    "repoData",
    async () => {
      const { data } = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${place}&units=metric&appid=${process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY}`
        // `https://api.openweathermap.org/data/2.5/forecast?lat=-37.813629&lon=144.963058&units=metric&appid=${process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY}`
      );
      return data;
    }
  );

  useEffect(() => {
    refetch();
  }, [place, refetch]);

  const forecastData = data?.list[0];

  /**
   * Returns the local date for a given date text and timezone.
   * @param dateText  The date text to parse.
   * @param timezone  The timezone offset in seconds.
   * @returns       The local date.
   */
  function getLocalDate(dateText: string, timezone: number): Date {

    // Set offset and parse date text
    const offsetInSeconds = timezone ?? 396000;
    const parsedDate = new Date(dateText ?? "");

    // Apply the offset to get the UTC timestamp
    const utcTimestamp = parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60000;

    // Apply the local timezone offset
    const localTimestamp = utcTimestamp + offsetInSeconds * 1000;

    // Create a new Date object with the local timestamp
    const localDate = new Date(localTimestamp);

    // Add offset hours to the time
    localDate.setHours(localDate.getHours() + offsetInSeconds / 3600);

    return localDate;
  }

  // Get unique dates
  const uniqueDates = data?.list ? Array.from(new Set(data.list.map((entry) => entry.dt_txt.split(" ")[0]))) : [];

  // For each unique date get the daily details (skip today)
  const dailyTemperatures = uniqueDates
    .slice(1) // Skip the first day/today
    .map((date) => {
      const entries = data?.list.filter((entry) => entry.dt_txt.split(" ")[0] === date) ?? [];
      const temps = entries.map((entry) => entry.main.temp);
      return {
        date,
        icon: entries[0].weather[0].icon,
        description: entries[0].weather[0].description,
        min: Math.min(...temps),
        max: Math.max(...temps),
        sunrise: data?.city.sunrise,
        sunset: data?.city.sunset,
      };
    });

  // console.log("uniqueDates: ", uniqueDates);
  // console.log("dailyTemperatures: ", dailyTemperatures);
  // console.log("data: ", data);

  if (isLoading)
    return (
      <div className="flex items-center min-h-screen justify-center">
        <p className="text-2xl animate-bounce">Loading...</p>
      </div>
    );

    if (error)
    return (
      <div className="flex items-center min-h-screen justify-center">
        {/* @ts-ignore */}
        <p className="text-red-400">{error.message}</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 bg-gray-100 min-h-screen">
      <Navbar location={data?.city.name}/>
      <main className="px-3 max-w-7xl mx-auto flex flex-col gap-9 w-full pb-10 pt-4">

      {loadingCity ? (
          <WeatherSkeleton />
        ) : (
          <>
        <section className="space-y-4">
          <div className="space-y-2">
            {/* Date */}
            <h2 className="flex gap-1 text-2xl items-end">
              {formatDate(parseISO(forecastData?.dt_txt ?? ""), "EEEE, d MMMM")}
            </h2>

            {/* Today */}
            <Container className="gap-1 px-6 items-center">
              <div className="flex flex-col px-4 gap-1">
                {/* Current Temperature */}
                {/* <WeatherIcon iconName={getDayOrNightIcon(forecastData?.weather[0].icon ?? "", forecastData?.dt_txt ?? "")} /> */}

                <span className="whitespace-nowrap flex flex-row items-center gap-2">
                  <p className="text-2xl">{"🌡"}</p>
                  <p className="text-5xl ">
                    {forecastData?.main.temp.toFixed(0) ?? 0} °C
                  </p>
                </span>

                {/* Feels Like Temperature */}
                <span>
                  Feels like {forecastData?.main.feels_like.toFixed(0) ?? 0} °C
                </span>

                {/* Description */}
                {/* <p className="text-xs space-x-1 whitespace-nowrap">
                  <span>
                    {forecastData?.weather[0].description
                      .split(" ")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </span>
                </p> */}

                {/* Min/Max Temps */}
                <p className="text-xs flex flex-col  whitespace-nowrap gap-1">
                  <span>
                    Min: {forecastData?.main.temp_min.toFixed(0) ?? 0} °C
                  </span>
                  <span>
                    Max: {forecastData?.main.temp_max.toFixed(0) ?? 0} °C
                  </span>
                </p>
              </div>

              {/* Time and weather icons */}
              <div className="flex px-4 gap-10 sm:gap-16 overflow-x-auto w-full justify-between">
                {data?.list
                  .filter((entry) => {
                    // Return entries for today up to 6AM tomorrow
                    const localDate = getLocalDate(entry.dt_txt, data?.city.timezone);
                    const entryDate = parseISO(localDate.toISOString());
                    const now = new Date();
                    const tomorrow6AM = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0, 0);
                    return (
                      entryDate.getDate() === now.getDate() ||
                      (entryDate > now && entryDate <= tomorrow6AM)
                    );
                  })
                  .map((entry, index) => (
                    <div
                      key={index}
                      className="flex flex-col justify-between gap-2 items-center text-xs font-semibold"
                    >
                      {/* Weather Icon */}
                      <WeatherIcon
                        iconname={getDayOrNightIcon(entry.weather[0].icon, entry.dt_txt)}
                      />

                      {/* Temperature */}
                      <span>{entry.main.temp.toFixed(0)} °C</span>

                      {/* Time */}
                      <p className="whitespace-nowrap">
                        {formatDate(getLocalDate(entry.dt_txt, data?.city.timezone), "h:mm a")}
                      </p>
                    </div>
                  ))}
              </div>
            </Container>
          </div>
          <div className="flex gap-4">
            {/* LEft */}
            <Container className="w-fit justify-center flex-col px-4 items-center">
              <p className="capitalize text-center">
                {forecastData?.weather[0].description}
              </p>
              <WeatherIcon
                iconname={getDayOrNightIcon(
                  forecastData?.weather[0].icon ?? "",
                  forecastData?.dt_txt ?? ""
                )}
              />
            </Container>
            {/* Right */}
            <Container className="bg-yellow-300/80 px-6 gap-4 justify-between overflow-x-auto">
              <WeatherDetails
                visibility={`${metersToKilometers(forecastData?.visibility ?? 0)} km`}
                humidity={`${forecastData?.main.humidity.toString()} %` ?? ""}
                windSpeed={`${forecastData?.wind.speed.toString()} km/h` ?? ""}
                airPressure={`${forecastData?.main.pressure.toString()} hPa`?? ""}
                sunrise={formatDate(fromUnixTime(data?.city.sunrise ?? 0), "h:mm a")}
                sunset={formatDate(fromUnixTime(data?.city.sunset ?? 0), "h:mm a")}
              />
            </Container>
          </div>
        </section>

        {/* 5-day Forecast */}
        <section className="flex w-full flex-col gap-4">
          <p className="text-2xl">5-day Forecast</p>
          {/* <div className="flex gap-4 overflow-x-auto justify-between w-full pr-10"> */}
            {dailyTemperatures
              .map((entry, index) => (
                <ForecastPanel
                  key={index}
                  icon={entry.icon}
                  day={formatDate(parseISO(entry.date), "EEEE")}
                  date={formatDate(parseISO(entry.date), "d MMMM")}
                  description={entry.description}
                  temp_min={entry.min}
                  temp_max={entry.max}
                  sunrise={formatDate(fromUnixTime(data?.city.sunrise ?? 0), "h:mm a")}
                  sunset={formatDate(fromUnixTime(data?.city.sunset ?? 0), "h:mm a")}
                />
              ))}
          {/* </div> */}
        </section>
        </>
      )}
      </main>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <section className="space-y-8 ">
      {/* Today's data skeleton */}
      <div className="space-y-2 animate-pulse">
        {/* Date skeleton */}
        <div className="flex gap-1 text-2xl items-end ">
          <div className="h-6 w-24 bg-gray-300 rounded"></div>
          <div className="h-6 w-24 bg-gray-300 rounded"></div>
        </div>

        {/* Time wise temperature skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="h-6 w-16 bg-gray-300 rounded"></div>
              <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
              <div className="h-6 w-16 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 7 days forecast skeleton */}
      <div className="flex flex-col gap-4 animate-pulse">
        <p className="text-2xl h-8 w-36 bg-gray-300 rounded"></p>

        {[1, 2, 3, 4, 5, 6, 7].map((index) => (
          <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
            <div className="h-8 w-28 bg-gray-300 rounded"></div>
            <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
            <div className="h-8 w-28 bg-gray-300 rounded"></div>
            <div className="h-8 w-28 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </section>
  );
}
