import * as vscode from "vscode";
import { RedmineServer } from "../redmine/redmine-server";
import { RedmineConfig } from "../definitions/redmine-config";
import { RedmineProject } from "../redmine/redmine-project";
import { Issue } from "../redmine/models/issue";

export class ProjectsTree
  implements vscode.TreeDataProvider<RedmineProject | Issue> {
  server: RedmineServer;
  viewStyle: number;
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
    this.viewStyle = 0;
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
      let subprojects;

      if (this.viewStyle) {
        subprojects = await this.server.getProjectsByParent(projectOrIssue.id);
        return (await this.server.getOpenIssuesForProject(projectOrIssue.id, 0))
          .issues.concat(subprojects);
      }

      return (await this.server.getOpenIssuesForProject(projectOrIssue.id))
        .issues;
    }

    if (this.viewStyle) {
      let projects: RedmineProject[] = [];
      await this.server.getProjects().then((projs) => {
        projs.forEach((proj) => {
          if (proj.parent == undefined)
            projects.push(proj);
        });
      });
      return projects;
    }

    return await this.server.getProjects();
  }

  toggleView() {
    this.viewStyle = (this.viewStyle) ? 0 : 1;
    this.onDidChangeTreeData$.fire();
  }

  setServer(server: RedmineServer) {
    this.server = server;
  }
}
