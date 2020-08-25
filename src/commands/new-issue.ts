import * as vscode from "vscode";
import { ActionProperties } from "./action-properties";

export default async ({ server, config }: ActionProperties) => {
  const open = (projectName: string) => {
    vscode.commands
      .executeCommand(
        "vscode.open",
        vscode.Uri.parse(
          `${server.options.address}/projects/${projectName}/issues/new`
        )
      )
      .then(undefined, (reason) => {
        vscode.window.showErrorMessage(reason);
      });
  };

  if (config.identifier) {
    return open(config.identifier);
  }

  const promise = server.getProjects();

  promise.then(
    (projects) => {
      vscode.window
        .showQuickPick(
          projects.map((project) => project.toQuickPickItem()),
          {
            placeHolder: "Choose project to create issue in",
          }
        )
        .then((project) => {
          if (project === undefined) return;
          open(project.identifier);
        });
    },
    (error) => {
      vscode.window.showErrorMessage(error);
    }
  );

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    (progress) => {
      progress.report({
        message: `Waiting for response from ${server.options.url.host}...`,
      });
      return promise;
    }
  );
};
