import { NamedEntity } from "./named-entity";

export interface Journal {
  id: number;
  user: NamedEntity;
  notes: string;
  created_on: string;
}
