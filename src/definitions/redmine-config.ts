import { WorkspaceConfiguration } from "vscode";

export interface RedmineConfig extends WorkspaceConfiguration {
  /**
   * URL of Redmine
   * @example https://example.com
   * @example http://example.com:8080
   * @example https://example.com:8443/redmine
   * @example http://example.com/redmine
   */
  url: string;
  /**
   * API Key
   */
  apiKey: string;
  /**
   * Pass rejectUnauthorized to https request options. Use only if your redmine instance has self-signed certificate!
   */
  rejectUnauthorized?: boolean;
  /**
   * Project identifier in Redmine
   */
  identifier?: string;
  /**
   * Additional headers
   */
  additionalHeaders?: { [key: string]: string };
  /**
   * Filter
   */
  filter: { status: [] };
  /**
   * Sort
   */
  sort: [];
}
