import { NamedEntity } from "./named-entity";

export interface Project {
  id: number;
  name: string;
  description: string;
  identifier: string;
  parent?: NamedEntity;
}
