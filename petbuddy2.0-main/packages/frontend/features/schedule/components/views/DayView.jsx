"use client";
import React from "react";
import DayScheduleView from "./DayScheduleView";

// Neutral alias for the Day view component
export default function DayView(props) {
  return <DayScheduleView {...props} />;
}
