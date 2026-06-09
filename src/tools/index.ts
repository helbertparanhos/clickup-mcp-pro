import { AnyToolDef } from "../types.js";
import { workspaceTools } from "./workspace.js";
import { spaceTools } from "./spaces.js";
import { folderTools } from "./folders.js";
import { listTools } from "./lists.js";
import { taskTools } from "./tasks.js";
import { bulkTaskTools } from "./tasks-bulk.js";
import { taskLinkTools } from "./task-links.js";
import { commentTools } from "./comments.js";
import { checklistTools } from "./checklists.js";
import { attachmentTools } from "./attachments.js";
import { tagTools } from "./tags.js";
import { customFieldTools } from "./custom-fields.js";
import { timeTrackingTools } from "./time-tracking.js";
import { docTools } from "./docs.js";
import { viewTools } from "./views.js";
import { goalTools } from "./goals.js";
import { chatTools } from "./chat.js";
import { sprintTools } from "./sprints.js";
import { webhookTools } from "./webhooks.js";
import { userGroupTools } from "./user-groups.js";
import { guestTools } from "./guests.js";
import { memberTools } from "./members.js";
import { templateTools } from "./templates.js";
import { rawTool } from "./raw.js";

/** Every typed tool, in a stable order, excluding clickup_raw (added conditionally). */
export const allTools: AnyToolDef[] = [
  ...workspaceTools,
  ...spaceTools,
  ...folderTools,
  ...listTools,
  ...taskTools,
  ...bulkTaskTools,
  ...taskLinkTools,
  ...commentTools,
  ...checklistTools,
  ...attachmentTools,
  ...tagTools,
  ...customFieldTools,
  ...timeTrackingTools,
  ...docTools,
  ...viewTools,
  ...goalTools,
  ...chatTools,
  ...sprintTools,
  ...webhookTools,
  ...userGroupTools,
  ...guestTools,
  ...memberTools,
  ...templateTools,
];

export { rawTool };
