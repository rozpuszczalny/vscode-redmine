import * as vscode from "vscode";
import { RedmineServer } from "../redmine/redmine-server";
import { RedmineConfig } from "../definitions/redmine-config";
import { RedmineProject } from "../redmine/redmine-project";
import { Issue } from "../redmine/models/issue";

export enum ProjectsViewStyle {
  LIST = 0,
  TREE = 1,
}

export class ProjectsTree
  implements vscode.TreeDataProvider<RedmineProject | Issue> {
  server: RedmineServer;
  viewStyle: ProjectsViewStyle;
  projects: RedmineProject[];
  constructor() {
    const config = vscode.workspace.getConfiguration(
      "redmine"
    ) as RedmineConfig;
    this.server = new RedmineServer({
      address: config.url,
      key: config.apiKey,
      additionalHeaders: config.additionalHeaders,
      rejectUnauthorized: config.rejectUnauthorized,
    });
    this.viewStyle = ProjectsViewStyle.LIST;
  }

  onDidChangeTreeData$ = new vscode.EventEmitter<void>();
  onDidChangeTreeData: vscode.Event<RedmineProject | Issue> = this
    .onDidChangeTreeData$.event;
  getTreeItem(
    projectOrIssue: RedmineProject | Issue
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (projectOrIssue instanceof RedmineProject) {
      return new vscode.TreeItem(
        projectOrIssue.toQuickPickItem().label,
        vscode.TreeItemCollapsibleState.Collapsed
      );
    } else {
      const item = new vscode.TreeItem(
        `#${projectOrIssue.id} [${projectOrIssue.tracker.name}] (${projectOrIssue.status.name}) ${projectOrIssue.subject} by ${projectOrIssue.author.name}`,
        vscode.TreeItemCollapsibleState.None
      );

      item.command = {
        command: "redmine.openActionsForIssue",
        arguments: [false, { server: this.server }, `${projectOrIssue.id}`],
        title: `Open actions for issue #${projectOrIssue.id}`,
      };

      return item;
    }
  }
  async getChildren(
    projectOrIssue?: RedmineProject | Issue
  ): Promise<(RedmineProject | Issue)[]> {
    if (projectOrIssue != null && projectOrIssue instanceof RedmineProject) {
      if (this.viewStyle === ProjectsViewStyle.TREE) {
        const subprojects = this.projects.filter(
          (project) => project.parent && project.parent.id === projectOrIssue.id
        );
        return subprojects.concat(
          (await this.server.getOpenIssuesForProject(projectOrIssue.id, false))
            .issues
        );
      }

      return (await this.server.getOpenIssuesForProject(projectOrIssue.id))
        .issues;
    }

    if (!this.projects || this.projects.length === 0) {
      this.projects = await this.server.getProjects();
    }

    if (this.viewStyle === ProjectsViewStyle.TREE) {
      return this.projects.filter((project) => !project.parent);
    }
    return this.projects;
  }

  clearProjects() {
    this.projects = [];
  }

  setViewStyle(style: ProjectsViewStyle) {
    this.viewStyle = style;
    this.onDidChangeTreeData$.fire();
  }

  setServer(server: RedmineServer) {
    this.server = server;
  }
}
