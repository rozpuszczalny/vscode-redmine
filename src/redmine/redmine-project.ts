import { RedmineServer } from "./redmine-server";
import { QuickPickItem } from "vscode";

export interface RedmineProjectOptions {
  /**
   * Important: It is **not** project identifier defined upon project
   * creation, it is an **ID** of a project in the database.
   * @example 1
   */
  id: string;
  name: string;
  description: string;
  identifier: string;
}

export interface ProjectQuickPickItem extends QuickPickItem {
  identifier: string;
  project: RedmineProject;
}

export class RedmineProject {
  constructor(
    private server: RedmineServer,
    private options: RedmineProjectOptions
  ) {}

  get id() {
    return this.options.id;
  }

  toQuickPickItem(): ProjectQuickPickItem {
    return {
      label: this.options.name,
      description: this.options.description
        .split("\n")
        .join(" ")
        .split("\r")
        .join(""),
      detail: this.options.identifier,
      identifier: this.options.identifier,
      project: this,
    };
  }
}
