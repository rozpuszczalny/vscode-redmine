import * as vscode from "vscode";
import { RedmineServer } from "../redmine/redmine-server";
import { RedmineConfig } from "../definitions/redmine-config";
import { RedmineProject } from "../redmine/redmine-project";
import { Issue } from "../redmine/models/issue";

export class ProjectsTree
  implements vscode.TreeDataProvider<RedmineProject | Issue> {
  server: RedmineServer;
  constructor() {
    const config = vscode.workspace.getConfiguration(
      "redmine"
    ) as RedmineConfig;
    this.server = new RedmineServer({
      address: config.url,
      key: config.apiKey,
    });
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
      return (await this.server.getOpenIssuesForProject(projectOrIssue.id))
        .issues;
    }

    return await this.server.getProjects();
  }

  setServer(server: RedmineServer) {
    this.server = server;
  }
}
