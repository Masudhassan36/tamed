"use client";

import { useEffect, useState } from "react";

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

export default function LiveDate() {
  const [today, setToday] = useState(() => formatToday(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(formatToday(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <time dateTime={today}>{today}</time>;
}
