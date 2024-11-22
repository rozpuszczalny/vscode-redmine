import * as vscode from "vscode";
import { Issue } from "../redmine/models/issue";
import { RedmineServer } from "../redmine/redmine-server";
import { RedmineConfig } from "../definitions/redmine-config";

export class MyIssuesTree implements vscode.TreeDataProvider<Issue> {
  server: RedmineServer;
  constructor() {
    const config = vscode.workspace.getConfiguration(
      "redmine"
    ) as RedmineConfig;
    this.server = new RedmineServer({
      address: config.url,
      key: config.apiKey,
      additionalHeaders: config.additionalHeaders,
      rejectUnauthorized: config.rejectUnauthorized,
      filter: config.filter,
      sort: config.sort,
    });
  }

  onDidChangeTreeData$ = new vscode.EventEmitter<Issue>();
  onDidChangeTreeData: vscode.Event<Issue> = this.onDidChangeTreeData$.event;
  getTreeItem(issue: Issue): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const item = new vscode.TreeItem(
      `#${issue.id} [${issue.tracker.name}] (${issue.status.name}) ${issue.subject} by ${issue.author.name}`,
      vscode.TreeItemCollapsibleState.None
    );

    item.command = {
      command: "redmine.openActionsForIssue",
      arguments: [false, { server: this.server }, `${issue.id}`],
      title: `Open actions for issue #${issue.id}`,
    };

    return item;
  }
  async getChildren(_element?: Issue): Promise<Issue[]> {
    return (await this.server.getIssuesAssignedToMe()).issues;
  }

  setServer(server: RedmineServer) {
    this.server = server;
  }
}
