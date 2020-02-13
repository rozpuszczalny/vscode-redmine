import { RedmineServer } from "../redmine/redmine-server";
import { RedmineConfig } from "../definitions/redmine-config";

export interface ActionProperties {
    server: RedmineServer;
    config: RedmineConfig;
}