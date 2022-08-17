import { NamedEntity } from "./named-entity";

interface MembershipBase {
  id: number;
  project: NamedEntity;
  roles: NamedEntity[];
}

export interface MembershipUser extends MembershipBase {
  user: NamedEntity;
}

export interface MembershipGroup extends MembershipBase {
  group: NamedEntity;
}

export type Membership = MembershipUser | MembershipGroup;
