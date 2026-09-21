// Additive demo data: five event/workshop projects structured around the classic German
// event-management phase model (Konzeption -> Planung -> Bewerbung -> Durchfuehrung ->
// Nachbereitung), used e.g. for community festivals, workshop series and sports events. Each
// project sits at a different point in that cycle so the AI assistant has varied, realistic
// grounding data (overdue tasks, at-risk milestones, waiting-for items, a risk) to answer
// against. Unlike scripts/seed.ts this does NOT delete the existing user or data — it only adds
// projects, skipping any whose name already exists for this user so the script is safe to rerun.
import "dotenv/config";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "../src/lib/db/client";
import { encodeStringList } from "../src/lib/db/fields";
import type { MilestoneStatus, Priority, ProjectStatus, TaskStatus } from "../src/generated/prisma/enums";

const email = process.env.DEMO_USER_EMAIL ?? "you@example.com";

interface PhaseSpec {
  title: "Konzeption" | "Planung" | "Bewerbung" | "Durchführung" | "Nachbereitung";
  offsetDays: number;
  status: MilestoneStatus;
  description?: string;
}

interface TaskSpec {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueOffsetDays?: number;
  completedOffsetDays?: number;
  estimatedDuration?: number;
}

interface ContactSpec {
  name: string;
  email: string;
  organization: string;
  role: string;
  roleOnProject: string;
}

interface WaitingSpec {
  title: string;
  sinceOffsetDays: number;
  followUpOffsetDays: number;
  notes?: string;
}

interface RiskSpec {
  title: string;
  description?: string;
  probability: "LOW" | "MEDIUM" | "HIGH";
  impact: "LOW" | "MEDIUM" | "HIGH";
  mitigation?: string;
  owner?: string;
}

interface ProjectSpec {
  name: string;
  description: string;
  objective: string;
  status: ProjectStatus;
  priority: Priority;
  startOffsetDays: number;
  targetOffsetDays: number;
  tags: string[];
  phases: PhaseSpec[];
  tasks: TaskSpec[];
  contact: ContactSpec;
  waiting?: WaitingSpec;
  risk?: RiskSpec;
}

const PROJECTS: ProjectSpec[] = [
  {
    name: "Nachbarschaftstage 2026",
    description:
      "Zweitägiges Stadtteilfest mit lokalen Vereinen, Ständen und Bühnenprogramm für den Ortsteil.",
    objective:
      "Standplan, Genehmigungen und Bühnenprogramm final abstimmen, bevor das Fest startet.",
    status: "ACTIVE",
    priority: "HIGH",
    startOffsetDays: -15,
    targetOffsetDays: 45,
    tags: ["event", "community", "2026"],
    phases: [
      { title: "Konzeption", offsetDays: -10, status: "DONE", description: "Grundkonzept, Zielgruppe und Budgetrahmen festgelegt." },
      { title: "Planung", offsetDays: 10, status: "AT_RISK", description: "Standplan, Ablaufplan und Genehmigungen bei der Stadt." },
      { title: "Bewerbung", offsetDays: 20, status: "PLANNED", description: "Aufruf an Vereine/Stände zur Teilnahme, Bewerbungsfrist, Auswahl." },
      { title: "Durchführung", offsetDays: 45, status: "PLANNED", description: "Zwei Tage Fest inklusive Auf- und Abbau." },
      { title: "Nachbereitung", offsetDays: 50, status: "PLANNED", description: "Abrechnung, Feedback, Dokumentation für das nächste Jahr." },
    ],
    tasks: [
      { title: "Standplan mit der Stadt abstimmen", status: "IN_PROGRESS", priority: "HIGH", dueOffsetDays: 8, estimatedDuration: 90 },
      { title: "Genehmigung für Bühnenlautstärke einholen", status: "PLANNED", priority: "CRITICAL", dueOffsetDays: -1 },
      { title: "Konzept-Dokument finalisieren", status: "COMPLETED", priority: "NORMAL", completedOffsetDays: -11 },
      { title: "Vereine für Standplätze anschreiben", status: "INBOX", priority: "NORMAL", dueOffsetDays: 18 },
    ],
    contact: {
      name: "Julia Hartmann",
      email: "julia.hartmann@stadt-xyz.example",
      organization: "Stadt XYZ – Ordnungsamt",
      role: "Genehmigungen",
      roleOnProject: "Genehmigungsbehörde",
    },
    waiting: {
      title: "Rückmeldung zur Lärmschutz-Genehmigung",
      sinceOffsetDays: -6,
      followUpOffsetDays: -1,
      notes: "Antrag am 15. eingereicht, seither keine Rückmeldung vom Ordnungsamt.",
    },
    risk: {
      title: "Genehmigung könnte sich verzögern und das Bühnenprogramm blockieren",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation: "Bis Ende der Woche telefonisch beim Ordnungsamt nachfassen statt weiter auf E-Mail-Antwort zu warten.",
      owner: "Julia Hartmann",
    },
  },
  {
    name: "Digitale Kompetenzen für Ehrenamtliche",
    description: "Vierteilige Workshopreihe zu digitalen Tools für ehrenamtlich Engagierte.",
    objective: "Konzept und Referent:innen stehen und die Anmeldung läuft, bevor der erste Termin startet.",
    status: "ACTIVE",
    priority: "NORMAL",
    startOffsetDays: -5,
    targetOffsetDays: 60,
    tags: ["workshop", "bildung", "ehrenamt"],
    phases: [
      { title: "Konzeption", offsetDays: 2, status: "AT_RISK", description: "Themen, Zielgruppe und Lernziele je Modul festlegen." },
      { title: "Planung", offsetDays: 15, status: "PLANNED", description: "Referent:innen buchen, Räume und Technik organisieren." },
      { title: "Bewerbung", offsetDays: 22, status: "PLANNED", description: "Ausschreibung an Vereine, Anmeldeformular, Bewerbungsschluss." },
      { title: "Durchführung", offsetDays: 60, status: "PLANNED", description: "Vier Workshop-Termine à drei Stunden." },
      { title: "Nachbereitung", offsetDays: 65, status: "PLANNED", description: "Feedbackbögen auswerten, Zertifikate versenden." },
    ],
    tasks: [
      { title: "Themenmodule mit Co-Trainerin abstimmen", status: "IN_PROGRESS", priority: "HIGH", dueOffsetDays: 2, estimatedDuration: 60 },
      { title: "Referentin für Modul 'Datenschutz' anfragen", status: "INBOX", priority: "NORMAL", dueOffsetDays: 6 },
      { title: "Lernziele je Modul dokumentieren", status: "COMPLETED", priority: "NORMAL", completedOffsetDays: -2 },
    ],
    contact: {
      name: "Thomas Reiner",
      email: "thomas.reiner@freiwilligenagentur-nord.example",
      organization: "Freiwilligenagentur Nord",
      role: "Kooperationspartner",
      roleOnProject: "Kooperationspartner",
    },
    waiting: {
      title: "Zusage von Referentin für Modul 3",
      sinceOffsetDays: -3,
      followUpOffsetDays: 3,
    },
  },
  {
    name: "Stadt im Wandel",
    description: "Gruppenausstellung lokaler Künstler:innen zum Thema Stadtentwicklung, drei Wochen in der Stadtgalerie.",
    objective: "Künstler:innen-Bewerbungen abschließen und das Ausstellungskonzept final klären, bevor der Aufbau beginnt.",
    status: "ACTIVE",
    priority: "NORMAL",
    startOffsetDays: -25,
    targetOffsetDays: 35,
    tags: ["kultur", "ausstellung"],
    phases: [
      { title: "Konzeption", offsetDays: -15, status: "DONE", description: "Kuratorisches Konzept und Thema festgelegt." },
      { title: "Planung", offsetDays: -5, status: "DONE", description: "Ausstellungsräume gebucht, grober Zeitplan steht." },
      { title: "Bewerbung", offsetDays: 5, status: "AT_RISK", description: "Aufruf an Künstler:innen zur Einreichung, Auswahl der Werke." },
      { title: "Durchführung", offsetDays: 35, status: "PLANNED", description: "Aufbau, Vernissage und dreiwöchige Ausstellung." },
      { title: "Nachbereitung", offsetDays: 42, status: "PLANNED", description: "Abbau, Künstler:innen-Honorare, Presseclipping." },
    ],
    tasks: [
      { title: "Bewerbungsaufruf an lokale Künstler:innen verschicken", status: "PLANNED", priority: "HIGH", dueOffsetDays: 2 },
      { title: "Auswahljury-Termin koordinieren", status: "INBOX", priority: "NORMAL", dueOffsetDays: 7 },
      { title: "Ausstellungsräume final bestätigen", status: "COMPLETED", priority: "NORMAL", completedOffsetDays: -6 },
      { title: "Versicherung für Kunstwerke klären", status: "PLANNED", priority: "HIGH", dueOffsetDays: -3 },
    ],
    contact: {
      name: "Nadja Brandt",
      email: "nadja.brandt@stadtgalerie.example",
      organization: "Stadtgalerie",
      role: "Ausstellungsleitung",
      roleOnProject: "Ausstellungsort",
    },
  },
  {
    name: "Cup der Vereine",
    description: "Eintägiges Fußballturnier für Jugendmannschaften lokaler Vereine, inklusive Bewerbung um den Austragungsort.",
    objective: "Austragungsort sichern sowie Schiedsrichter und Anmeldungen organisieren, bevor das Turnier stattfindet.",
    status: "AT_RISK",
    priority: "HIGH",
    startOffsetDays: -30,
    targetOffsetDays: 25,
    tags: ["sport", "jugend", "turnier"],
    phases: [
      { title: "Konzeption", offsetDays: -20, status: "DONE" },
      { title: "Planung", offsetDays: -5, status: "DONE", description: "Spielplan-Format und Budget festgelegt." },
      { title: "Bewerbung", offsetDays: -2, status: "AT_RISK", description: "Bewerbung um den Sportplatz beim Sportamt eingereicht, Zusage steht noch aus." },
      { title: "Durchführung", offsetDays: 25, status: "PLANNED" },
      { title: "Nachbereitung", offsetDays: 28, status: "PLANNED" },
    ],
    tasks: [
      { title: "Zusage vom Sportamt einholen", status: "IN_PROGRESS", priority: "CRITICAL", dueOffsetDays: -2 },
      { title: "Schiedsrichter für 8 Spiele anfragen", status: "INBOX", priority: "HIGH", dueOffsetDays: 10 },
      { title: "Mannschaften zur Anmeldung auffordern", status: "PLANNED", priority: "NORMAL", dueOffsetDays: 5 },
      { title: "Spielplan-Entwurf erstellen", status: "COMPLETED", priority: "NORMAL", completedOffsetDays: -8 },
    ],
    contact: {
      name: "Klaus Bittner",
      email: "klaus.bittner@sportamt.example",
      organization: "Sportamt der Stadt",
      role: "Platzvergabe",
      roleOnProject: "Genehmigungsbehörde",
    },
    waiting: {
      title: "Zusage oder Absage für den Sportplatz vom Sportamt",
      sinceOffsetDays: -9,
      followUpOffsetDays: -1,
    },
    risk: {
      title: "Kein bestätigter Austragungsort 25 Tage vor dem Turnier",
      probability: "HIGH",
      impact: "HIGH",
      mitigation: "Sportplatz B beim Nachbarverein als Rückfalloption anfragen.",
      owner: "Klaus Bittner",
    },
  },
  {
    name: "Lichterabend",
    description: "Abendliche Spendengala mit Dinner und Auktion zugunsten des Jugendzentrums.",
    objective: "Die Veranstaltung sauber abschließen und Spendensumme sowie Dank an Sponsor:innen dokumentieren.",
    status: "ACTIVE",
    priority: "NORMAL",
    startOffsetDays: -70,
    targetOffsetDays: -5,
    tags: ["fundraising", "gala"],
    phases: [
      { title: "Konzeption", offsetDays: -60, status: "DONE" },
      { title: "Planung", offsetDays: -40, status: "DONE" },
      { title: "Bewerbung", offsetDays: -20, status: "DONE", description: "Einladungen und Sponsor:innen-Akquise abgeschlossen." },
      { title: "Durchführung", offsetDays: -5, status: "DONE", description: "Gala-Abend erfolgreich durchgeführt." },
      { title: "Nachbereitung", offsetDays: 5, status: "AT_RISK", description: "Dankschreiben, Spendenabrechnung und Presseclipping." },
    ],
    tasks: [
      { title: "Dankschreiben an Sponsor:innen versenden", status: "IN_PROGRESS", priority: "HIGH", dueOffsetDays: 2 },
      { title: "Spendensumme final abrechnen", status: "PLANNED", priority: "CRITICAL", dueOffsetDays: -1 },
      { title: "Fotos und Presseclipping sammeln", status: "INBOX", priority: "NORMAL", dueOffsetDays: 7 },
      { title: "Einladungen verschicken", status: "COMPLETED", priority: "NORMAL", completedOffsetDays: -25 },
      { title: "Location und Catering buchen", status: "COMPLETED", priority: "NORMAL", completedOffsetDays: -45 },
    ],
    contact: {
      name: "Sabine Wolter",
      email: "sabine.wolter@jugendzentrum-ost.example",
      organization: "Jugendzentrum Ost",
      role: "Ansprechpartnerin vor Ort",
      roleOnProject: "Begünstigte Organisation",
    },
    waiting: {
      title: "Rechnung vom Caterer für die Endabrechnung",
      sinceOffsetDays: -4,
      followUpOffsetDays: 1,
    },
  },
];

async function main() {
  const today = startOfDay(new Date());

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No user found for ${email} — run "npm run db:seed" first.`);
  }

  for (const spec of PROJECTS) {
    const existing = await prisma.project.findFirst({ where: { userId: user.id, name: spec.name } });
    if (existing) {
      console.log(`Skipping "${spec.name}" — already exists.`);
      continue;
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: spec.name,
        description: spec.description,
        objective: spec.objective,
        status: spec.status,
        priority: spec.priority,
        startDate: addDays(today, spec.startOffsetDays),
        targetDate: addDays(today, spec.targetOffsetDays),
        responsiblePerson: user.name,
        tagsJson: encodeStringList(spec.tags),
      },
    });

    await Promise.all(
      spec.phases.map((phase, index) =>
        prisma.milestone.create({
          data: {
            projectId: project.id,
            title: phase.title,
            description: phase.description,
            targetDate: addDays(today, phase.offsetDays),
            status: phase.status,
            order: index,
          },
        }),
      ),
    );

    await Promise.all(
      spec.tasks.map((task) =>
        prisma.task.create({
          data: {
            userId: user.id,
            projectId: project.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueOffsetDays !== undefined ? addDays(today, task.dueOffsetDays) : undefined,
            completedAt: task.completedOffsetDays !== undefined ? addDays(today, task.completedOffsetDays) : undefined,
            estimatedDuration: task.estimatedDuration,
          },
        }),
      ),
    );

    const contact = await prisma.contact.create({
      data: {
        userId: user.id,
        name: spec.contact.name,
        email: spec.contact.email,
        organization: spec.contact.organization,
        role: spec.contact.role,
        isInternal: false,
      },
    });
    await prisma.projectContact.create({
      data: { projectId: project.id, contactId: contact.id, roleOnProject: spec.contact.roleOnProject },
    });

    if (spec.waiting) {
      await prisma.waitingItem.create({
        data: {
          userId: user.id,
          projectId: project.id,
          contactId: contact.id,
          title: spec.waiting.title,
          since: addDays(today, spec.waiting.sinceOffsetDays),
          suggestedFollowUpAt: addDays(today, spec.waiting.followUpOffsetDays),
          status: "OPEN",
          notes: spec.waiting.notes,
        },
      });
    }

    if (spec.risk) {
      await prisma.projectRisk.create({
        data: {
          projectId: project.id,
          title: spec.risk.title,
          description: spec.risk.description,
          probability: spec.risk.probability,
          impact: spec.risk.impact,
          mitigation: spec.risk.mitigation,
          owner: spec.risk.owner,
          status: "IDENTIFIED",
          source: "MANUAL",
          isConfirmed: true,
        },
      });
    }

    await prisma.activityLogEntry.create({
      data: {
        userId: user.id,
        entityType: "Project",
        entityId: project.id,
        action: "project_created",
        summary: `Created project '${spec.name}'`,
        createdAt: addDays(today, spec.startOffsetDays),
      },
    });

    console.log(`Created "${spec.name}" with ${spec.phases.length} phases and ${spec.tasks.length} tasks.`);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
