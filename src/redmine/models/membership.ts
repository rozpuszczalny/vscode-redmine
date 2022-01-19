import { NamedEntity } from "./named-entity";

export interface Membership {
  id: number;
  project: NamedEntity;
  user: NamedEntity;
  roles: NamedEntity[];
}
