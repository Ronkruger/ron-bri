import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import confetti from "canvas-confetti";
import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  format,
  isSameDay,
  setYear,
} from "date-fns";
import { relationshipApi, calendarApi } from "@ronbri/api-client";
import { useAuth } from "../contexts/AuthContext";
import type { DateEvent } from "@ronbri/types";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const confettiFired = useRef(false);

  const { data: rel } = useQuery({
    queryKey: ["relationship"],
    queryFn: relationshipApi.get,
  });

  const { data: events = [] } = useQuery<DateEvent[]>({
    queryKey: ["calendar"],
    queryFn: calendarApi.list,
  });

  const startDate = rel ? new Date(rel.startDate) : null;
  const today = new Date();

  const years = startDate ? differenceInYears(today, startDate) : 0;
  const afterYears = startDate
    ? new Date(startDate.getFullYear() + years, startDate.getMonth(), startDate.getDate())
    : today;
  const months = startDate ? differenceInMonths(today, afterYears) : 0;
  const afterMonths = startDate
    ? new Date(afterYears.getFullYear(), afterYears.getMonth() + months, afterYears.getDate())
    : today;
  const days = startDate ? differenceInDays(today, afterMonths) : 0;

  // Anniversary confetti
  useEffect(() => {
    if (!startDate || confettiFired.current) return;
    const anniversary = setYear(startDate, today.getFullYear());
    if (isSameDay(today, anniversary)) {
      confettiFired.current = true;
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    }
  }, [startDate]);

  const upcoming = [...events]
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="p-6 max-w-2xl mx-auto pb-28 md:pb-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-16 h-16 rounded-[1.5rem] object-cover border border-white shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black text-2xl shadow-md">
              {user?.displayName?.charAt(0) ?? "R"}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-gray-800">
              Hey {user?.displayName}! {user?.role === "BOY" ? "💙" : "💛"}
            </h1>
            <p className="text-gray-500 font-medium mt-1">Here's your love dashboard 🌸</p>
          </div>
        </div>
      </motion.div>

      {/* Days Together Counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-4xl bg-white shadow-lg p-8 mb-6 border border-gray-100"
      >
        <div className="text-center mb-6">
          <span className="text-2xl font-black text-gray-800">
            💙 Ron Ron & BriBri 💛
          </span>
          <p className="text-gray-400 font-medium mt-1">Together for</p>
        </div>

        <div className="flex justify-center gap-4">
          {[
            { value: years, label: years === 1 ? "Year" : "Years" },
            { value: months, label: months === 1 ? "Month" : "Months" },
            { value: days, label: days === 1 ? "Day" : "Days" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="flex-1 text-center bg-[var(--color-light)] rounded-3xl py-5 px-2"
            >
              <div className="text-4xl font-black text-[var(--color-accent)]">
                <CountUp end={value} duration={1.5} />
              </div>
              <div className="text-sm font-semibold text-[var(--color-primary)] mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>

        {startDate && (
          <p className="text-center text-gray-400 font-medium mt-4 text-sm">
            Since {format(startDate, "MMMM d, yyyy")} 🌸
          </p>
        )}
      </motion.div>

      {/* Upcoming Dates */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-black text-gray-700 mb-4">Upcoming Dates 📅</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-3xl bg-white border border-dashed border-gray-200 p-6 text-center text-gray-400 font-medium">
            No upcoming dates — go plan something! 🗓️
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ scale: 1.02 }}
                className={`rounded-3xl bg-white shadow-sm p-5 border-l-4 ${
                  event.createdBy?.role === "BOY"
                    ? "border-blue-400"
                    : "border-yellow-400"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {event.createdBy?.avatar ? (
                      <img
                        src={event.createdBy.avatar}
                        alt={event.createdBy.displayName}
                        className="w-11 h-11 rounded-2xl object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center font-black shrink-0">
                        {event.createdBy?.displayName?.charAt(0) ?? "R"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 truncate">
                        {event.emoji} {event.title}
                      </div>
                      {event.description && (
                        <div className="text-sm text-gray-500 mt-0.5 truncate">{event.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-400 ml-4 whitespace-nowrap">
                    {format(new Date(event.date), "MMM d")}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DashboardPage;
