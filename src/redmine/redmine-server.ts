import { Url, parse } from "url";
import * as http from "http";
import * as https from "https";
import { RedmineProject } from "./redmine-project";
import {
  IssueStatus,
  Membership,
  QuickUpdate,
  QuickUpdateResult,
} from "../controllers/domain";
import { TimeEntryActivity } from "./models/time-entry-activity";
import { Project } from "./models/project";
import { TimeEntry } from "./models/time-entry";
import { Issue } from "./models/issue";
import { IssueStatus as RedmineIssueStatus } from "./models/issue-status";
import { Membership as RedmineMembership } from "./models/membership";
import isNil from "lodash/isNil";
import isEqual from "lodash/isEqual";

type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const REDMINE_API_KEY_HEADER_NAME = "X-Redmine-API-Key";

export interface RedmineServerConnectionOptions {
  /**
   * @example https://example.com
   * @example http://example.com:8080
   * @example https://example.com:8443/redmine
   * @example http://example.com/redmine
   */
  address: string;
  /**
   * @example 7215ee9c7d9dc229d2921a40e899ec5f
   */
  key: string;
  /**
   * @default false
   */
  rejectUnauthorized?: boolean;
  /**
   * @example { "Authorization": "Basic YTph" }
   */
  additionalHeaders?: { [key: string]: string };
  /**
   * @example { status: [1, 2, 3] }
   */
  filter?: { status: [] };
  /**
   * @example [ "status:desc"]
   */
  sort?: [];
}

interface RedmineServerOptions extends RedmineServerConnectionOptions {
  url: Url;
}

export class RedmineOptionsError extends Error {
  name = "RedmineOptionsError";
}

export class RedmineServer {
  options!: RedmineServerOptions;

  private timeEntryActivities: TimeEntryActivity[] | null = null;

  get request() {
    return this.options.url.protocol === "https:"
      ? https.request
      : http.request;
  }

  private validateOptions(options: RedmineServerConnectionOptions): void {
    if (!options.address) {
      throw new RedmineOptionsError("Address cannot be empty!");
    }
    if (!options.key) {
      throw new RedmineOptionsError("Key cannot be empty!");
    }
    const url = parse(options.address);
    if (["https:", "http:"].indexOf(url.protocol ?? "") === -1) {
      throw new RedmineOptionsError(
        "Address must have supported protocol (http/https)"
      );
    }
  }

  private setOptions(options: RedmineServerConnectionOptions) {
    this.options = {
      ...options,
      url: parse(options.address),
    };
    if (isNil(this.options.additionalHeaders)) {
      this.options.additionalHeaders = {};
    }
  }

  constructor(options: RedmineServerConnectionOptions) {
    this.validateOptions(options);
    this.setOptions(options);
  }

  doRequest<T>(path: string, method: HttpMethods, data?: Buffer): Promise<T> {
    const { url, key, additionalHeaders, rejectUnauthorized } = this.options;
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      headers: {
        [REDMINE_API_KEY_HEADER_NAME]: key,
        ...additionalHeaders,
      },
      rejectUnauthorized: rejectUnauthorized,
      path: `${url.pathname}${path}`,
      method,
    };
    if (data) {
      options.headers!["Content-Length"] = data.length;
      options.headers!["Content-Type"] = "application/json";
    }

    return new Promise((resolve, reject) => {
      let incomingBuffer = Buffer.from("");
      const handleData = (_: http.IncomingMessage) => (incoming: Buffer) => {
        incomingBuffer = Buffer.concat([incomingBuffer, incoming]);
      };

      const handleEnd = (clientResponse: http.IncomingMessage) => () => {
        const { statusCode, statusMessage } = clientResponse;
        if (statusCode === 401) {
          reject(
            new Error(
              "Server returned 401 (perhaps your API Key is not valid, or your server has additional authentication methods?)"
            )
          );
          return;
        }
        if (statusCode === 403) {
          reject(
            new Error(
              "Server returned 403 (perhaps you haven't got permissions?)"
            )
          );
          return;
        }
        if (statusCode === 404) {
          reject(new Error("Resource doesn't exist"));
          return;
        }

        // TODO: Other errors handle
        if (statusCode! >= 400) {
          reject(new Error(`Server returned ${statusMessage}`));
          return;
        }

        if (incomingBuffer.length > 0) {
          try {
            const object = JSON.parse(incomingBuffer.toString("utf8"));
            resolve(object);
          } catch (e) {
            reject(new Error("Couldn't parse Redmine response as JSON..."));
          }
          return;
        }

        // Using `doRequest` on the endpoints that return 204 should type as void/null
        resolve((null as unknown) as T);
      };

      const clientRequest = this.request(options, (incoming) => {
        incoming.on("data", handleData(incoming));
        incoming.on("end", handleEnd(incoming));
      });

      const handleError = (error: Error) => {
        reject(
          new Error(`NodeJS Request Error (${error.name}): ${error.message}`)
        );
      };

      clientRequest.on("error", handleError);

      clientRequest.end(data);
    });
  }

  async getProjects(): Promise<RedmineProject[]> {
    const req = async (
      offset = 0,
      limit = 50,
      count: number | null = null,
      accumulator: RedmineProject[] = []
    ): Promise<RedmineProject[]> => {
      if (count && count <= offset) {
        return accumulator;
      }

      const [totalCount, result]: [
        number,
        RedmineProject[]
      ] = await this.doRequest<{
        projects: Project[];
        total_count: number;
      }>(`/projects.json?limit=${limit}&offset=${offset}`, "GET").then(
        ({ total_count, projects }) => [
          total_count,
          projects.map(
            (proj) =>
              new RedmineProject(this, {
                ...proj,
              })
          ),
        ]
      );

      return req(offset + limit, limit, totalCount, accumulator.concat(result));
    };

    return req();
  }

  getTimeEntryActivities(): Promise<{
    time_entry_activities: TimeEntryActivity[];
  }> {
    if (this.timeEntryActivities) {
      return Promise.resolve({
        time_entry_activities: this.timeEntryActivities,
      });
    }
    return this.doRequest<{
      time_entry_activities: TimeEntryActivity[];
    }>(`/enumerations/time_entry_activities.json`, "GET").then((response) => {
      if (response) {
        this.timeEntryActivities = response.time_entry_activities;
      }

      return response;
    });
  }

  addTimeEntry(
    issueId: number,
    activityId: number,
    hours: string,
    message: string
  ): Promise<unknown> {
    return this.doRequest<{ time_entry: TimeEntry }>(
      `/time_entries.json`,
      "POST",
      Buffer.from(
        JSON.stringify({
          time_entry: <TimeEntry>{
            issue_id: issueId,
            activity_id: activityId,
            hours,
            comments: message,
          },
        })
      )
    );
  }

  /**
   * Returns promise, that resolves to an issue
   * @param issueId ID of issue
   */
  getIssueById(issueId: number): Promise<{ issue: Issue }> {
    return this.doRequest(`/issues/${issueId}.json?include=journals`, "GET");
  }

  /**
   * Returns promise, that resolves, when issue status is set
   */
  setIssueStatus(issue: Issue, statusId: number): Promise<unknown> {
    return this.doRequest<{ issue: Issue }>(
      `/issues/${issue.id}.json`,
      "PUT",
      Buffer.from(
        JSON.stringify({
          issue: {
            status_id: statusId,
          },
        }),
        "utf8"
      )
    );
  }

  issueStatuses: { issue_statuses: RedmineIssueStatus[] } | null = null;

  /**
   * Returns promise, that resolves to list of issue statuses in provided redmine server
   */
  getIssueStatuses(): Promise<{ issue_statuses: RedmineIssueStatus[] }> {
    if (isNil(this.issueStatuses)) {
      return this.doRequest<{ issue_statuses: RedmineIssueStatus[] }>(
        "/issue_statuses.json",
        "GET"
      ).then((obj) => {
        if (obj) {
          // Shouldn't change much; cache it.
          this.issueStatuses = obj;
        }

        return obj;
      });
    } else {
      return Promise.resolve(this.issueStatuses);
    }
  }

  async getIssueStatusesTyped(): Promise<IssueStatus[]> {
    const statuses = await this.getIssueStatuses();
    return statuses.issue_statuses.map((s) => new IssueStatus(s.id, s.name));
  }
  async getMemberships(projectId: number): Promise<Membership[]> {
    const membershipsResponse = await this.doRequest<{
      memberships: RedmineMembership[];
    }>(`/projects/${projectId}/memberships.json`, "GET");

    return membershipsResponse.memberships.map((m) =>
      "user" in m
        ? new Membership(m.user.id, m.user.name)
        : new Membership(m.group.id, m.group.name, false)
    );
  }
  async applyQuickUpdate(quickUpdate: QuickUpdate): Promise<QuickUpdateResult> {
    await this.doRequest<void>(
      `/issues/${quickUpdate.issueId}.json`,
      "PUT",
      Buffer.from(
        JSON.stringify({
          issue: {
            status_id: quickUpdate.status.statusId,
            assigned_to_id: quickUpdate.assignee.id,
            notes: quickUpdate.message,
          },
        }),
        "utf8"
      )
    );
    const issueRequest = await this.getIssueById(quickUpdate.issueId);
    const issue = issueRequest.issue;
    const updateResult = new QuickUpdateResult();
    if (issue.assigned_to.id !== quickUpdate.assignee.id) {
      updateResult.addDifference("Couldn't assign user");
    }
    if (issue.status.id !== quickUpdate.status.statusId) {
      updateResult.addDifference("Couldn't update status");
    }
    return updateResult;
  }

  /**
   * Returns promise, that resolves to list of issues assigned to api key owner
   */
  getIssuesAssignedToMe(): Promise<{ issues: Issue[] }> {
    const status_id: string = this.options.filter?.status?.join("|") ?? "open";
    const sort: string = this.options.sort?.join(",") ?? "id:desc";
    return this.doRequest<{ issues: Issue[] }>(
      `/issues.json?status_id=${status_id}&assigned_to_id=me&sort=${sort}&limit=999`,
      "GET"
    );
  }

  /**
   * Returns promise, that resolves to list of open issues for project
   */
  getOpenIssuesForProject(
    project_id: number | string,
    include_subproject = true
  ): Promise<{ issues: Issue[] }> {
    if (include_subproject) {
      return this.doRequest<{ issues: Issue[] }>(
        `/issues.json?status_id=open&project_id=${project_id}&subproject_id=!*`,
        "GET"
      );
    } else {
      return this.doRequest<{ issues: Issue[] }>(
        `/issues.json?status_id=open&project_id=${project_id}`,
        "GET"
      );
    }
  }

  compare(other: RedmineServer) {
    return (
      this.options.address === other.options.address &&
      this.options.key === other.options.key &&
      this.options.rejectUnauthorized === other.options.rejectUnauthorized &&
      isEqual(this.options.additionalHeaders, other.options.additionalHeaders)
    );
  }
}
