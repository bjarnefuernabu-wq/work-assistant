import "dotenv/config";
import { addDays, set, startOfDay, subDays } from "date-fns";
import { prisma } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";
import { encodeStringList } from "../src/lib/db/fields";

const email = process.env.DEMO_USER_EMAIL ?? "you@example.com";
const password = process.env.DEMO_USER_PASSWORD ?? "changeme123";

function at(date: Date, hours: number, minutes = 0) {
  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
}

async function main() {
  const today = startOfDay(new Date());

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Removing existing demo user (${email}) and cascaded data...`);
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "Ben Goelnitz",
      passwordHash: hashPassword(password),
    },
  });
  console.log(`Created user ${user.email}`);

  // ---------------------------------------------------------------------
  // Connectors (simulated)
  // ---------------------------------------------------------------------
  const calendarConnector = await prisma.connector.create({
    data: {
      userId: user.id,
      type: "CALENDAR",
      provider: "mock-calendar",
      displayName: "Demo Calendar",
      status: "CONNECTED",
      lastSyncedAt: new Date(),
      lastSyncStatus: "OK",
    },
  });

  const mailConnector = await prisma.connector.create({
    data: {
      userId: user.id,
      type: "MAIL",
      provider: "mock-mail",
      displayName: "Demo Mail",
      status: "CONNECTED",
      lastSyncedAt: new Date(),
      lastSyncStatus: "OK",
    },
  });

  // ---------------------------------------------------------------------
  // Project: Outdoor Action Day
  // ---------------------------------------------------------------------
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Outdoor Action Day",
      description:
        "Full-day outdoor sponsor/partner event for ~300 attendees: partner-run activity stations, a live program, and on-site technical setup.",
      objective:
        "Confirm all partners, finalize the program and site plan, and have technical setup and communications ready before event day.",
      status: "AT_RISK",
      priority: "HIGH",
      startDate: subDays(today, 20),
      targetDate: addDays(today, 18),
      responsiblePerson: user.name,
      tagsJson: encodeStringList(["event", "partners", "q4"]),
      notes: "Second annual edition. Budget carried over from last year's sponsor package.",
    },
  });

  const secondProject = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Internal Tools Cleanup",
      description: "Low-priority backlog of internal process fixes.",
      objective: "Reduce time spent on manual reporting by end of quarter.",
      status: "ON_HOLD",
      priority: "LOW",
      startDate: subDays(today, 40),
      tagsJson: encodeStringList(["internal"]),
    },
  });

  // ---------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------
  await Promise.all([
    prisma.milestone.create({
      data: {
        projectId: project.id,
        title: "Partners confirmed",
        targetDate: addDays(today, 3),
        status: "AT_RISK",
        order: 0,
        description: "All partner activity stations signed off with final commitments.",
      },
    }),
    prisma.milestone.create({
      data: {
        projectId: project.id,
        title: "Program finalized",
        targetDate: addDays(today, 7),
        status: "PLANNED",
        order: 1,
      },
    }),
    prisma.milestone.create({
      data: {
        projectId: project.id,
        title: "Communication live",
        targetDate: addDays(today, 12),
        status: "PLANNED",
        order: 2,
      },
    }),
  ]);
  await prisma.milestone.create({
    data: {
      projectId: project.id,
      title: "Event day",
      targetDate: addDays(today, 18),
      status: "PLANNED",
      order: 3,
    },
  });

  // ---------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------
  const alex = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Alex Berger",
      email: "alex.berger@example.com",
      organization: "Internal",
      role: "Event Co-lead",
      isInternal: true,
    },
  });
  const lisa = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Lisa Vogel",
      email: "lisa.vogel@greentrail-outdoors.example",
      organization: "GreenTrail Outdoors",
      role: "Sponsor contact",
      isInternal: false,
    },
  });
  const marco = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Marco Weiss",
      email: "marco@techstage-av.example",
      organization: "TechStage AV",
      role: "AV vendor",
      isInternal: false,
    },
  });

  await prisma.projectContact.createMany({
    data: [
      { projectId: project.id, contactId: alex.id, roleOnProject: "Co-lead" },
      { projectId: project.id, contactId: lisa.id, roleOnProject: "Sponsor" },
      { projectId: project.id, contactId: marco.id, roleOnProject: "Vendor" },
    ],
  });

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------
  const confirmPartners = await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Confirm partners",
      description: "Get final written confirmation from all partner activity stations.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: addDays(today, 3),
      plannedDate: addDays(today, 1),
      estimatedDuration: 120,
      tagsJson: encodeStringList(["partners"]),
    },
  });

  const finalizeSchedule = await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Finalize event schedule",
      status: "PLANNED",
      priority: "HIGH",
      dueDate: addDays(today, 7),
      plannedDate: addDays(today, 4),
      estimatedDuration: 180,
    },
  });
  await prisma.taskDependency.create({
    data: { taskId: finalizeSchedule.id, dependsOnId: confirmPartners.id },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Finalize site plan",
      status: "PLANNED",
      priority: "NORMAL",
      dueDate: addDays(today, 9),
      estimatedDuration: 90,
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Coordinate technical setup",
      description: "Blocked until TechStage AV confirms their quote.",
      status: "WAITING",
      priority: "HIGH",
      dueDate: addDays(today, 10),
      estimatedDuration: 60,
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Prepare communication materials",
      status: "INBOX",
      priority: "NORMAL",
      dueDate: addDays(today, 11),
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Book portable toilets",
      status: "COMPLETED",
      priority: "NORMAL",
      completedAt: subDays(today, 5),
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Send sponsor deck to Partner A",
      status: "COMPLETED",
      priority: "NORMAL",
      completedAt: subDays(today, 9),
    },
  });

  // Overdue, critical — should surface prominently on the dashboard.
  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: project.id,
      title: "Follow up with venue on power capacity",
      status: "PLANNED",
      priority: "CRITICAL",
      dueDate: subDays(today, 2),
      estimatedDuration: 30,
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      title: "Draft press release",
      status: "INBOX",
      priority: "LOW",
    },
  });

  // A couple of unrelated / low-priority tasks so lists aren't single-project.
  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: secondProject.id,
      title: "Automate weekly status report",
      status: "PLANNED",
      priority: "LOW",
      plannedDate: addDays(today, 6),
      estimatedDuration: 60,
    },
  });

  // ---------------------------------------------------------------------
  // Waiting items (follow-ups)
  // ---------------------------------------------------------------------
  await prisma.waitingItem.create({
    data: {
      userId: user.id,
      projectId: project.id,
      contactId: lisa.id,
      title: "Confirmation from Partner A on sponsorship amount",
      since: subDays(today, 8),
      suggestedFollowUpAt: subDays(today, 1),
      status: "OPEN",
      notes: "Sent updated sponsorship tiers on the 8th, no reply since.",
    },
  });

  await prisma.waitingItem.create({
    data: {
      userId: user.id,
      projectId: project.id,
      contactId: marco.id,
      title: "AV vendor quote for stage sound system",
      since: subDays(today, 3),
      suggestedFollowUpAt: addDays(today, 2),
      status: "OPEN",
    },
  });

  // ---------------------------------------------------------------------
  // Decisions & risks
  // ---------------------------------------------------------------------
  await prisma.decision.create({
    data: {
      projectId: project.id,
      title: "Rain-date policy: indoor backup hall",
      description:
        "Agreed to hold the community hall as an indoor backup instead of postponing to a rain date.",
      date: subDays(today, 6),
      participantsJson: encodeStringList(["Alex Berger", "Lisa Vogel"]),
      source: "Planning call",
      consequences: "Need to confirm indoor hall availability before milestone 2.",
    },
  });

  await prisma.projectRisk.create({
    data: {
      projectId: project.id,
      title: "Insufficient partner confirmations before program deadline",
      description:
        "Partner confirmation milestone is in 3 days; the sponsor contact hasn't responded in 8 days.",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation: "Escalate with a direct call this week instead of waiting on email.",
      owner: "Alex Berger",
      status: "IDENTIFIED",
      source: "MANUAL",
      isConfirmed: true,
    },
  });

  await prisma.projectRisk.create({
    data: {
      projectId: project.id,
      title: "AV vendor may not confirm in time for technical setup",
      description:
        "No confirmed quote yet from TechStage AV; technical setup task is already blocked.",
      probability: "MEDIUM",
      impact: "MEDIUM",
      status: "IDENTIFIED",
      source: "AI_SUGGESTED",
      isConfirmed: false,
    },
  });

  // ---------------------------------------------------------------------
  // Calendar events
  // ---------------------------------------------------------------------
  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      connectorId: calendarConnector.id,
      externalId: "demo-evt-1",
      projectId: project.id,
      title: "Partner sync call — Lisa Vogel",
      startTime: at(addDays(today, 1), 10, 0),
      endTime: at(addDays(today, 1), 10, 30),
      requiresPrep: true,
      prepNotes: "Bring the updated sponsorship tiers doc.",
      attendeesJson: encodeStringList(["lisa.vogel@greentrail-outdoors.example"]),
      lastSyncedAt: new Date(),
      syncStatus: "OK",
    },
  });

  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      connectorId: calendarConnector.id,
      externalId: "demo-evt-2",
      title: "Internal planning stand-up",
      startTime: at(today, 9, 0),
      endTime: at(today, 9, 15),
      lastSyncedAt: new Date(),
      syncStatus: "OK",
    },
  });

  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      connectorId: calendarConnector.id,
      externalId: "demo-evt-3",
      projectId: project.id,
      title: "Site walkthrough",
      startTime: at(addDays(today, 4), 14, 0),
      endTime: at(addDays(today, 4), 15, 30),
      lastSyncedAt: new Date(),
      syncStatus: "OK",
    },
  });

  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      connectorId: calendarConnector.id,
      externalId: "demo-evt-4",
      projectId: project.id,
      title: "Outdoor Action Day",
      startTime: addDays(today, 18),
      endTime: addDays(today, 18),
      isAllDay: true,
      lastSyncedAt: new Date(),
      syncStatus: "OK",
    },
  });

  // ---------------------------------------------------------------------
  // Email threads
  // ---------------------------------------------------------------------
  const sponsorThread = await prisma.emailThread.create({
    data: {
      userId: user.id,
      connectorId: mailConnector.id,
      externalId: "demo-thread-1",
      projectId: project.id,
      subject: "Re: Sponsorship confirmation — GreenTrail Outdoors",
      participantsJson: encodeStringList([lisa.email!, user.email]),
      lastMessageAt: subDays(today, 8),
      isUnread: false,
      requiresAction: true,
      snippet: "...still waiting on final confirmation of the sponsorship amount...",
      lastSyncedAt: new Date(),
    },
  });
  await prisma.emailMessage.createMany({
    data: [
      {
        threadId: sponsorThread.id,
        fromAddress: user.email,
        fromName: user.name,
        toAddressesJson: encodeStringList([lisa.email!]),
        sentAt: subDays(today, 9),
        bodyText:
          "Hi Lisa, attaching the updated sponsorship tiers for this year — could you confirm which tier GreenTrail wants to commit to?",
        isFromUser: true,
      },
      {
        threadId: sponsorThread.id,
        fromAddress: lisa.email!,
        fromName: "Lisa Vogel",
        toAddressesJson: encodeStringList([user.email]),
        sentAt: subDays(today, 8),
        bodyText:
          "Thanks for sending this over — I need to check internally on budget. Will confirm the amount and logo placement by early next week.",
        isFromUser: false,
      },
    ],
  });

  const avThread = await prisma.emailThread.create({
    data: {
      userId: user.id,
      connectorId: mailConnector.id,
      externalId: "demo-thread-2",
      projectId: project.id,
      subject: "AV setup requirements",
      participantsJson: encodeStringList([marco.email!, user.email]),
      lastMessageAt: subDays(today, 3),
      isUnread: true,
      requiresAction: true,
      snippet: "...need confirmed power draw numbers before I can quote the sound system...",
      lastSyncedAt: new Date(),
    },
  });
  await prisma.emailMessage.create({
    data: {
      threadId: avThread.id,
      fromAddress: marco.email!,
      fromName: "Marco Weiss",
      toAddressesJson: encodeStringList([user.email]),
      sentAt: subDays(today, 3),
      bodyText:
        "Before I can send a quote for the stage sound system I need confirmed power draw numbers from the venue. Can you get those from the site walkthrough?",
      isFromUser: false,
    },
  });

  // ---------------------------------------------------------------------
  // Inbox items
  // ---------------------------------------------------------------------
  await prisma.inboxItem.create({
    data: {
      userId: user.id,
      type: "EMAIL",
      title: "Unclear email from Marco about power requirements",
      content: "Mentions needing power draw numbers — may already be covered by site walkthrough.",
      sourceType: "email",
      sourceReference: avThread.id,
      status: "NEW",
      suggestedProjectId: project.id,
      suggestedType: "task",
      suggestedReason:
        "Mentions AV/technical setup, which matches the 'Coordinate technical setup' task on Outdoor Action Day.",
    },
  });
  await prisma.inboxItem.create({
    data: {
      userId: user.id,
      type: "IDEA",
      title: "Consider a small merch table at the event",
      sourceType: "manual",
      status: "NEW",
    },
  });
  await prisma.inboxItem.create({
    data: {
      userId: user.id,
      type: "NOTE",
      title: "Check insurance certificate deadline",
      sourceType: "manual",
      status: "NEW",
    },
  });

  // ---------------------------------------------------------------------
  // Working memory
  // ---------------------------------------------------------------------
  await prisma.memoryEntry.createMany({
    data: [
      {
        userId: user.id,
        category: "PREFERENCE",
        content:
          "Monday mornings are reserved for focused project work — avoid scheduling meetings before 10:00 on Mondays.",
        source: "user",
      },
      {
        userId: user.id,
        category: "WORKING_PATTERN",
        content: "Prefers a quick task triage pass at the start and end of each day.",
        source: "user",
      },
      {
        userId: user.id,
        category: "CONTACT",
        content:
          "Lisa Vogel (GreenTrail Outdoors) is the primary sponsor contact for Outdoor Action Day — keep tone professional but warm.",
        source: "user",
      },
      {
        userId: user.id,
        category: "PROJECT_KNOWLEDGE",
        content: "Outdoor Action Day is currently the highest-priority active project.",
        source: "user",
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Activity log (a plausible history)
  // ---------------------------------------------------------------------
  await prisma.activityLogEntry.createMany({
    data: [
      {
        userId: user.id,
        entityType: "Project",
        entityId: project.id,
        action: "project_created",
        summary: "Created project 'Outdoor Action Day'",
        createdAt: subDays(today, 20),
      },
      {
        userId: user.id,
        entityType: "Task",
        entityId: undefined,
        action: "task_completed",
        summary: "Completed 'Send sponsor deck to Partner A'",
        createdAt: subDays(today, 9),
      },
      {
        userId: user.id,
        entityType: "Task",
        action: "task_completed",
        summary: "Completed 'Book portable toilets'",
        createdAt: subDays(today, 5),
      },
      {
        userId: user.id,
        entityType: "Decision",
        action: "decision_logged",
        summary: "Logged decision: rain-date policy (indoor backup hall)",
        createdAt: subDays(today, 6),
      },
      {
        userId: user.id,
        entityType: "Connector",
        entityId: calendarConnector.id,
        action: "connector_synced",
        summary: "Demo Calendar synced (4 events)",
        createdAt: new Date(),
      },
      {
        userId: user.id,
        entityType: "Connector",
        entityId: mailConnector.id,
        action: "connector_synced",
        summary: "Demo Mail synced (2 threads)",
        createdAt: new Date(),
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`Login with: ${email} / ${password}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
