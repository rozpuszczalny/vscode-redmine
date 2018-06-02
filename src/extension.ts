import { IssueController } from './controllers/issue-controller';
'use strict';

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { CancellationToken, QuickPickItem } from 'vscode';

import { Redmine } from './redmine/redmine';

export interface PickItem extends QuickPickItem {
    label: string;
    description: string;
    detail: string;
    fullIssue: any;
}

export function activate(context: vscode.ExtensionContext) {
    let redmine: Redmine = null;

    let settings = {
        "serverUrl": null,
        "serverPort": null,
        "serverIsSsl": null,
        "apiKey": null,
        "rejectUnauthorized": true,
        // Type:
        //  * name - name of query
        //  * conditions - array of conditions, concated with OR
        //    * name - name of condition, eg. project
        //    * value - value of condition, eg. "In progress" or 1 (which is id of project id)
        "customQueries": []
    };

    let hadErrors = false;

    // TODO: Change this poor settings management system
    let wsSettings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('redmine');
    
    let configUpdate = () => {
        hadErrors = false;
        wsSettings = vscode.workspace.getConfiguration('redmine');
        for (let key in settings) {
            if (!wsSettings.has(key) || (wsSettings.get(key) === "")) {
                vscode.window.showErrorMessage(`Redmine integration: ${key} is required`);
                hadErrors = true;
            } else {
                settings[key] = wsSettings.get(key);
            }
        }

        if (!hadErrors) {
            redmine = new Redmine(settings.serverUrl, settings.serverPort, settings.serverIsSsl, settings.apiKey, settings.rejectUnauthorized);
            console.log(settings.customQueries);
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
    
            promise.then((issue) => {
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

    let customQueries = vscode.commands.registerCommand('redmine.chooseCustomQuery', () => {
        if (redmine == null) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        vscode.window.showQuickPick<PickItem>(settings.customQueries.map(it => { return {
            "label": it.name,
            "description": "",
            "detail": "",
            "fullIssue": it
        }; })).then(
            (chosen) => {
                if (!chosen) return;
                redmine.getAllIssues().then(
                    (issues) => {
                        vscode.window.showQuickPick<PickItem>(issues.issues.filter(
                            (issue) => {
                                return chosen.fullIssue.conditions.some((con => {
                                    return issue[con.name].id === con.value || issue[con.name].name === con.value;
                                }))
                                // return issue[chosen.fullIssue.name].id === chosen.fullIssue.value || issue[chosen.fullIssue.name].name === chosen.fullIssue.value;
                            }
                        ).map((issue) => {
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
                        // issues.issues.forEach(issue => {
                        //     if (issue[chosen.name].id === chosen.value || issue[chosen.name].name === chosen.value) {
                        //         let controller = new IssueController(issue, redmine);

                        //         controller.listActions();
                        //     } 
                        // });
                    }
                )
            }
        );
    });

    context.subscriptions.push(listIssues);
    context.subscriptions.push(getIssue);
    context.subscriptions.push(customQueries);
}

// this method is called when your extension is deactivated
export function deactivate() {
}