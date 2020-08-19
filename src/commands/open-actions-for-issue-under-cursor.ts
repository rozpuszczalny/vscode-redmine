import { RedmineServer } from "../redmine/redmine-server";
import * as vscode from "vscode";
import openActionsForIssueId from "./commons/open-actions-for-issue-id";
import { ActionProperties } from "./action-properties";

function getTextUnderCursor(editor: vscode.TextEditor): string {
  const currentSelection = editor.selection;
  const document = editor.document;
  if (currentSelection.isEmpty) {
    const cursorWordRange = document.getWordRangeAtPosition(
      currentSelection.active
    );
    if (cursorWordRange) {
      const newSelection = new vscode.Selection(
        cursorWordRange.start.line,
        cursorWordRange.start.character,
        cursorWordRange.end.line,
        cursorWordRange.end.character
      );
      editor.selection = newSelection;
      return editor.document.getText(newSelection);
    }
    return "";
  } else {
    return document.getText(currentSelection);
  }
}

function getIssueIdUnderCursor(): string | null {
  const editor = vscode.window.activeTextEditor;
  const text = getTextUnderCursor(editor);
  const issueId = text.replace("#", "").replace(":", "");
  if (!/^\d+$/.test(issueId)) {
    vscode.window.showErrorMessage("No issue selected");
    return null;
  }
  return issueId;
}

export default async ({ server }: ActionProperties) => {
  const issueId = getIssueIdUnderCursor();

  await openActionsForIssueId(server, issueId);
};
