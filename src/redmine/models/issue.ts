import { NamedEntity } from "./named-entity";
import { Journal } from "./journal";

export interface Issue {
  id: number;
  project: NamedEntity;
  tracker: NamedEntity;
  status: NamedEntity;
  priority: NamedEntity;
  author: NamedEntity;
  assigned_to: NamedEntity;
  subject: string;
  description: string;
  start_date: string;
  due_date: string | null;
  done_ratio: number;
  is_private: boolean;
  estimated_hours: number | null;
  created_on: string;
  updated_on: string;
  closed_on: string | null;
  journals: Journal[];
}
