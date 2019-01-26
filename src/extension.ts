import { IssueController } from './controllers/issue-controller';
'use strict';

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { CancellationToken, QuickPickItem, Selection } from 'vscode';

import { Redmine } from './redmine/redmine';
import { BulkUpdate } from './controllers/domain';

export interface PickItem extends QuickPickItem {
    label: string;
    description: string;
    detail: string;
    fullIssue?: any;
    [key: string]: any;
}

export function activate(context: vscode.ExtensionContext) {
    let redmine: Redmine = null;

    let settings = {
        "serverUrl": null,
        "serverPort": null,
        "serverIsSsl": null,
        "apiKey": null,
        "rejectUnauthorized": true,
        "projectName": null,
        "authorization": null
    };

    let hadErrors = false;

    // TODO: Change this poor settings management system
    let wsSettings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('redmine');

    let configUpdate = () => {
        hadErrors = false;
        wsSettings = vscode.workspace.getConfiguration('redmine');
        for (let key in settings) {
            if (["projectName", "authorization"].indexOf(key) > -1) {
                if (wsSettings.has(key) && wsSettings.get(key) !== "") {
                    settings[key] = wsSettings.get(key);
                } else {
                    settings[key] = null;
                }

                continue;
            }
            if (!wsSettings.has(key) || (wsSettings.get(key) === "")) {
                vscode.window.showErrorMessage(`Redmine integration: ${key} is required`);
                hadErrors = true;
            } else {
                settings[key] = wsSettings.get(key);
            }
        }

        if (!hadErrors) {
            redmine = new Redmine(settings.serverUrl, settings.serverPort, settings.serverIsSsl, settings.apiKey, settings.authorization, settings.rejectUnauthorized);
        } else {
            redmine = null;
        }
    };

    configUpdate();

    vscode.workspace.onDidChangeConfiguration(configUpdate, null, context.subscriptions);

    let listIssues = vscode.commands.registerCommand('redmine.listOpenIssuesAssignedToMe', () => {
        if (redmine == null) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        let promise = redmine.getIssuesAssignedToMe();

        promise.then((issues) => {
            vscode.window.showQuickPick<PickItem>(issues.issues.map((issue) => {
                return {
                    "label": `[${issue.tracker.name}] (${issue.status.name}) ${issue.subject} by ${issue.author.name}`,
                    "description": issue.description.split("\n").join(" ").split("\r").join(""),
                    "detail": `Issue #${issue.id} assigned to ${issue.assigned_to ? issue.assigned_to.name : "no one"}`,
                    "fullIssue": issue
                }
            })).then((issue) => {
                if (issue === undefined) return;

                let controller = new IssueController(issue.fullIssue, redmine);

                controller.listActions();
            })
        }, (error) => {
            vscode.window.showErrorMessage(error);
        })

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window
        }, (progress) => {
            progress.report({ "message": `Waiting for response from ${redmine.host}...` });
            return promise;
        });
    });

    let getIssue = vscode.commands.registerCommand('redmine.openActionsForIssue', () => {
        if (redmine == null) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        vscode.window.showInputBox({
            placeHolder: `Type in issue id`
        }).then((issueId) => {
            if (!issueId) return;
            if (!issueId.trim()) {
                // Warning message
                return;
            }

            let promise = redmine.getIssueById(issueId);

            promise.then(async (issue) => {
                if (!issue) return;

                let controller = new IssueController(issue.issue, redmine);
                controller.listActions();
            }, (error) => {
                vscode.window.showErrorMessage(error);
            })

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window
            }, (progress) => {
                progress.report({ "message": `Waiting for response from ${redmine.host}...` });
                return promise;
            });
        });
    });

    let workflowUnderCursor = vscode.commands.registerCommand('redmine.workflowUnderCursor', async () => {
        if (redmine == null) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        const issueId = getIssueUnderCursor();
        if(!issueId) return;

        const issue = await redmine.getIssueById(issueId.trim());
        const memberships = await redmine.getMemberships(issue.issue.project.id);
        const possibleStatuses = await redmine.getIssueStatusesTyped();

        const statusChoice = await vscode.window.showQuickPick(
            possibleStatuses.map(status => {
                return {
                    "label": status.name,
                    "description": "",
                    "detail": "",
                    "status": status
                }
            }),
            {
                placeHolder: `Current: ${issue.issue.status.name}`
            }
        );
        if(!statusChoice) {
            return;
        }

        const desiredStatus = statusChoice.status;

        const assigneeChoice = await vscode.window.showQuickPick(
            memberships.map(membership => {
                return {
                    "label": membership.userName,
                    "description": "",
                    "detail": "",
                    "assignee": membership
                }
            }),
            {
                placeHolder: `Current: ${issue.issue.assigned_to.name}`
            }
        );
        if(!assigneeChoice) {
            return;
        }

        const desiredAssignee = assigneeChoice.assignee;
        const message = await vscode.window.showInputBox({ placeHolder: "Message" });

        const bulkUpdate = new BulkUpdate(issueId, message, desiredAssignee, desiredStatus);
        const updateResult = await redmine.applyBulkUpdate(bulkUpdate);
        if(updateResult.isSuccessful()) {
            vscode.window.showInformationMessage("Issue updated");
        } else {
            vscode.window.showErrorMessage("Could not update issue", ...updateResult.differences);
        }
    });

    let newIssue = vscode.commands.registerCommand('redmine.newIssue', () => {
        if (redmine == null) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        const open = (projectName: string) => {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`${redmine.url}/projects/${projectName}/issues/new`)).then((success) => {
            }, (reason) => {
                vscode.window.showErrorMessage(reason);
            });
        }

        if (settings.projectName === null) {
            let promise = redmine.getProjects();
    
            promise.then((projects) => {
                vscode.window.showQuickPick<PickItem>(projects.projects.map((project) => {
                    return {
                        "label": `${project.name}`,
                        "description": project.description.split("\n").join(" ").split("\r").join(""),
                        "detail": `${project.identifier}`,
                        "identifier": project.identifier
                    }
                }), {
                    placeHolder: "Choose project to create issue in"
                }).then((project) => {
                    if (project === undefined) return;
                    open(project.identifier);
                })
            }, (error) => {
                vscode.window.showErrorMessage(error);
            })
    
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window
            }, (progress) => {
                progress.report({ "message": `Waiting for response from ${redmine.host}...` });
                return promise;
            });
        } else {
            open(settings.projectName);
        }


    });

    context.subscriptions.push(listIssues);
    context.subscriptions.push(getIssue);
    context.subscriptions.push(newIssue);
    context.subscriptions.push(workflowUnderCursor);
}

function getIssueUnderCursor() : string | null {
    const editor = vscode.window.activeTextEditor;
    const text = getIssueIdUnderCursor(editor);
    const issueId = text.replace("#", "").replace(":", "");
    if(!/^\d+$/.test(issueId)) {
        vscode.window.showErrorMessage("No issue selected");
        return null;
    }
    return issueId;
}

function getIssueIdUnderCursor(editor: vscode.TextEditor): string {
    const currentSelection = editor.selection;
    const document = editor.document;
    if (currentSelection.isEmpty) {
        const cursorWordRange = document.getWordRangeAtPosition(currentSelection.active);
        if(cursorWordRange) {
            const newSelection = new Selection(cursorWordRange.start.line, cursorWordRange.start.character, cursorWordRange.end.line, cursorWordRange.end.character);
            editor.selection = newSelection;
            return editor.document.getText(newSelection);
        }
        return "";
    } else {
        return document.getText(currentSelection);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}