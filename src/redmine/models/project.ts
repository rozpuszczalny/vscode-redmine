export interface Project {
  id: string | number;
  name: string;
  description: string;
  identifier: string;
  parent?: ProjectParentItem;
}

export interface ProjectParentItem {
   id: string;
   name: string;
}
