export class Membership {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly isUser = true
  ) {}
}

export class IssueStatus {
  constructor(public readonly statusId: number, public readonly name: string) {}
}

export class QuickUpdate {
  constructor(
    public readonly issueId: number,
    public readonly message: string,
    public readonly assignee: Membership,
    public readonly status: IssueStatus
  ) {}
}

export class QuickUpdateResult {
  public readonly differences: string[] = [];

  public isSuccessful() {
    return this.differences.length === 0;
  }

  public addDifference(difference: string) {
    this.differences.push(difference);
  }
}
