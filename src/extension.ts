import * as vscode from "vscode";
import { RedmineServer } from "./redmine/redmine-server";
import { RedmineProject } from "./redmine/redmine-project";
import openActionsForIssue from "./commands/open-actions-for-issue";
import openActionsForIssueUnderCursor from "./commands/open-actions-for-issue-under-cursor";
import listOpenIssuesAssignedToMe from "./commands/list-open-issues-assigned-to-me";
import newIssue from "./commands/new-issue";

export function activate(context: vscode.ExtensionContext) {
  const bucket = {
    servers: [] as RedmineServer[],
    projects: [] as RedmineProject[]
  };

  const parseConfiguration = () => {
    return vscode.window
      .showWorkspaceFolderPick()
      .then(v => {
        const config = vscode.workspace.getConfiguration("redmine", v.uri);
        const redmineServer = new RedmineServer({
          address: config.url,
          key: config.apiKey
        });

        const server =
          bucket.servers.find(s => s.compare(redmineServer)) || redmineServer;

        return {
            server,
            config
        };
      })
      .then(
        s => s,
        err => {
          console.log(err);
          throw err;
        }
      );
  };

  const registerCommand = (name, action) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(`redmine.${name}`, () => {
        parseConfiguration().then(action);
      })
    );
  };

  registerCommand("listOpenIssuesAssignedToMe", listOpenIssuesAssignedToMe);
  registerCommand("openActionsForIssue", openActionsForIssue);
  registerCommand("openActionsForIssueUnderCursor", openActionsForIssueUnderCursor);
  registerCommand("newIssue", newIssue);
}

// this method is called when your extension is deactivated
export function deactivate() {}
