import { ProjectParentItem } from "../redmine-project";

export interface Project {
  id: string | number;
  name: string;
  description: string;
  identifier: string;
  parent: ProjectParentItem;
}
