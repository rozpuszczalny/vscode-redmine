# Change Log
All notable changes to the "vscode-redmine" extension will be documented in this file.

## [Unreleased]

## 0.3.1 - 20.08.2018

### Fixed
- Issue #7 (thanks to hanyuzhou2006 for discovering and fixing an issue!)

## 0.3.0 - 21.06.2018

### Added
- Create issue command
  - You can configure project name under `redmine.projectName` setting
  - You can choose project from the list, if `redmine.projectName` isn't configured
- 0.2.2 `CHANGELOG.md` entry

### Changed
- 0.2.1 correct year in `CHANGELOG.md`

## 0.2.2 - 07.06.2018

### Added
- Attribution of Redmine Logo

## 0.2.1 - 07.06.2018

### Added
- Extension icon

### Changed
- Display name

## 0.2.0 - 02.06.2018

### Added
- `rejectUnauthorized` parameter, which is passed to https request options
- Missing open by issue id in feature list in `README.md`
- Information about future features in `README.md`

## 0.1.1 - 14.03.2018

### Fixed
- messy issue description in quick pick

## 0.1.0 - 04.02.2018

Added more basic functionalities to this extensions.

### Added
- possibility to change issue status
- possibility to add time entries to issue
- getting issue actions by typing in an issue id

### Changed
- splitted changelog entries into separate sections

### Removed
- `Release notes` section in `README.md` - it can be viewed here, so there is no reason to copy that across multiple files

## 0.0.2 - 28.01.2018
### Added
- repository URL to `package.json`, so VSCode Marketplace see `README.md` and other files

## 0.0.1 - 28.01.2018
Initial release of `vscode-redmine`

### Added
- list of issues assigned to API key owner
- possibility to open issue in browser
- configuration for server and API key