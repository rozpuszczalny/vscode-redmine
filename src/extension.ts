import * as vscode from "vscode";
import { RedmineServer } from "./redmine/redmine-server";
import { RedmineProject } from "./redmine/redmine-project";
import openActionsForIssue from "./commands/open-actions-for-issue";
import openActionsForIssueUnderCursor from "./commands/open-actions-for-issue-under-cursor";
import listOpenIssuesAssignedToMe from "./commands/list-open-issues-assigned-to-me";
import newIssue from "./commands/new-issue";
import { RedmineConfig } from "./definitions/redmine-config";
import { ActionProperties } from "./commands/action-properties";
import { MyIssuesTree } from "./trees/my-issues-tree";
import { ProjectsTree, ProjectsViewStyle } from "./trees/projects-tree";

export function activate(context: vscode.ExtensionContext): void {
  const bucket = {
    servers: [] as RedmineServer[],
    projects: [] as RedmineProject[],
  };

  const myIssuesTree = new MyIssuesTree();
  const projectsTree = new ProjectsTree();

  vscode.window.createTreeView("redmine-explorer-my-issues", {
    treeDataProvider: myIssuesTree,
  });
  vscode.window.createTreeView("redmine-explorer-projects", {
    treeDataProvider: projectsTree,
  });

  vscode.commands.executeCommand(
    "setContext",
    "redmine:hasSingleConfig",
    (vscode.workspace.workspaceFolders?.length ?? 0) <= 1
  );

  vscode.commands.executeCommand(
    "setContext",
    "redmine:treeViewStyle",
    ProjectsViewStyle.LIST
  );

  const parseConfiguration = async (
    withPick = true,
    props?: ActionProperties,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ): Promise<{
    props?: ActionProperties;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[];
  }> => {
    if (!withPick) {
      return Promise.resolve({
        props,
        args,
      });
    }

    const pickedFolder = await vscode.window.showWorkspaceFolderPick();

    vscode.commands.executeCommand(
      "setContext",
      "redmine:hasSingleConfig",
      !pickedFolder
    );

    const config = vscode.workspace.getConfiguration(
      "redmine",
      pickedFolder?.uri
    ) as RedmineConfig;

    const redmineServer = new RedmineServer({
      address: config.url,
      key: config.apiKey,
      additionalHeaders: config.additionalHeaders,
      rejectUnauthorized: config.rejectUnauthorized,
    });

    const fromBucket = bucket.servers.find((s) => s.compare(redmineServer));
    const server = fromBucket || redmineServer;

    if (!fromBucket) {
      bucket.servers.push(server);
    }

    return {
      props: {
        server,
        config,
      },
      args: [],
    };
  };

  const currentConfig = vscode.workspace.getConfiguration("redmine");

  if (currentConfig.has("serverUrl")) {
    const panel = vscode.window.createWebviewPanel(
      "redmineConfigurationUpdate",
      "vscode-redmine: New configuration arrived!",
      vscode.ViewColumn.One,
      {}
    );

    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>vscode-redmine: New configuration arrived!</title>
        <style>html, body { font-size: 16px; } p, li { line-height: 1.5; }</style>
    </head>
    <body>
        <h1>vscode-redmine: New configuration arrived!</h1>
        <p>Thanks for using <code>vscode-redmine</code>! From version 1.0.0, an old configuration schema has changed. We've detected, that you still use old format, so please update it to the new one.</p>
        <p>
            Following changed:
            <ul>
                <li><code>redmine.serverUrl</code>, <code>redmine.serverPort</code> and <code>redmine.serverIsSsl</code> became single setting: <code>redmine.url</code>.<br />
                If you had <code>serverUrl = 'example.com/test'</code>, <code>serverPort = 8080</code> and <code>serverIsSsl = true</code>, then new <code>url</code> will be <code>https://example.com:8080/test</code>.</li>
                <li><code>redmine.projectName</code> became <code>redmine.identifier</code>. Behavior remains the same</li>
                <li><code>redmine.authorization</code> is deprecated. If you want to add <code>Authorization</code> header to every request sent to redmine, provide <code>redmine.additionalHeaders</code>, eg.:
                    <pre>{"redmine.additionalHeaders": {"Authorization": "Basic 123qwe"}}</pre>
                </li>
            </ul>
        </p>
    </body>
    </html>`;
  }

  const registerCommand = (
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action: (props: ActionProperties, ...args: any[]) => void
  ) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `redmine.${name}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (withPick?: boolean, props?: ActionProperties, ...args: any[]) => {
          parseConfiguration(withPick, props, ...args).then(
            ({ props, args }) => {
              // `props` should be set when `withPick` is `false`.
              // Otherwise `parseConfiguration` will take care of getting ActionProperties.
              // It's used mainly by trees that always pass props argument.
              action(props!, ...args);
            }
          );
        }
      )
    );
  };

  registerCommand("listOpenIssuesAssignedToMe", listOpenIssuesAssignedToMe);
  registerCommand("openActionsForIssue", openActionsForIssue);
  registerCommand(
    "openActionsForIssueUnderCursor",
    openActionsForIssueUnderCursor
  );
  registerCommand("newIssue", newIssue);
  registerCommand("changeDefaultServer", (conf) => {
    myIssuesTree.setServer(conf.server);
    projectsTree.setServer(conf.server);

    projectsTree.onDidChangeTreeData$.fire();
    myIssuesTree.onDidChangeTreeData$.fire();
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("redmine.refreshIssues", () => {
      projectsTree.clearProjects();
      projectsTree.onDidChangeTreeData$.fire();
      myIssuesTree.onDidChangeTreeData$.fire();
    }),
    vscode.commands.registerCommand("redmine.toggleTreeView", () => {
      vscode.commands.executeCommand(
        "setContext",
        "redmine:treeViewStyle",
        ProjectsViewStyle.LIST
      );
      projectsTree.setViewStyle(ProjectsViewStyle.LIST);
    }),
    vscode.commands.registerCommand("redmine.toggleListView", () => {
      vscode.commands.executeCommand(
        "setContext",
        "redmine:treeViewStyle",
        ProjectsViewStyle.TREE
      );
      projectsTree.setViewStyle(ProjectsViewStyle.TREE);
    })
  );
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
