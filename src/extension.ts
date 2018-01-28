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
    console.log(`Context storage path for my extension is: ${context.storagePath}`);
    console.log(`Context extension path for my extension is: ${context.extensionPath}`);

    let redmine: Redmine = null;

    let settings = {
        "serverUrl": null,
        "serverPort": null,
        "serverIsSsl": null,
        "apiKey": null
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
            redmine = new Redmine(settings.serverUrl, settings.serverPort, settings.serverIsSsl, settings.apiKey);
        } else {
            redmine = null;
        }
    };

    configUpdate();

    vscode.workspace.onDidChangeConfiguration(configUpdate, null, context.subscriptions);

    let disposable = vscode.commands.registerCommand('redmine.listOpenIssuesAssignedToMe', () => {
        if (redmine == null) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        // TODO: Move request-specific code to another class
        const options: http.RequestOptions = {
            hostname: settings.serverUrl,
            port: settings.serverPort,
            path: '/issues.json?status_id=open&assigned_to_id=me',
            method: 'GET',
            headers: {
                "X-Redmine-API-Key": settings.apiKey
            }
        };

        let promise = redmine.getIssuesAssignedToMe();

        promise.then((issues) => {
            vscode.window.showQuickPick<PickItem>(issues.issues.map((issue) => {
                return {
                    "label": `[${issue.tracker.name}] (${issue.status.name}) ${issue.subject} by ${issue.author.name}`,
                    "description": issue.description,
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

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}