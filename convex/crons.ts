import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for due reminders every minute
crons.interval("check reminders", { minutes: 1 }, internal.reminders.checkAndSend);

export default crons;