# `vscode-redmine`

Redmine extension for Visual Studio Code.

## Features

* Create issue (opens redmine create issue in browser)
* List of issues assigned to you
* Open issue by id
* Issue actions:
  * Change status of an issue
  * Add time entry to an issue
  * Open issue in browser

_Missing a feature? Open an issue and let me know!_

## Requirements

It's required to enable REST web services in `/settings?tab=api` of your redmine (you have to be administator of redmine server).

## Extension Settings

This extension contributes the following settings:

* `redmine.serverUrl`: URL of redmine server (eg. `redmine.example.com`, `example.com/redmine` _etc._)
* `redmine.serverPort`: Port of redmine server (default: `443`)
* `redmine.serverIsSsl`: Should be connected through SSL or not (default: `true`)
* `redmine.apiKey`: API Key of your redmine account (see `/my/account` page, on right-hand pane)
* `redmine.rejectUnauthorized`: Parameter, which is passed to https request options (true/false) (useful to fix issues with self-signed certificates, see issue #3)
* `redmine.projectName`: If set, this will be the project, to which new issue will be created.

  _NOTE: this is an identifier of project, not display name of the project_

## Contribution

Feel free to contact me, if you want to contribute. ToDo features can be found in `Projects` tab on GitHub.

## Known Issues

No known issues yet. If you found one, feel free to open an issue!

## Release Notes

See `CHANGELOG.md`

## Attributions

### Logo

Logo is remixed version of original Redmine Logo.

Redmine Logo is Copyright (C) 2009 Martin Herr and is licensed under the Creative Commons Attribution-Share Alike 2.5 Generic license.
See http://creativecommons.org/licenses/by-sa/2.5/ for more details.

**Enjoy!**
