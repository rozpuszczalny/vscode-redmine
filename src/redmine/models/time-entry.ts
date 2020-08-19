import { TimeEntryActivity } from "./time-entry-activity";

export interface TimeEntry {
  issue_id: number;
  activity_id: TimeEntryActivity["id"];
  hours: string;
  comments: string;
}
