import type { ResumeJSON } from "@/types/resume";

const bullets = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) =>
    i === 0
      ? `<p><strong>${prefix}</strong> rebuilt the ingestion pipeline handling <em>2.4M events/day</em>, cutting p95 latency from 820ms to 140ms.</p>`
      : `${prefix} item ${i + 1}: delivered a cross-team initiative with measurable impact on reliability, cost and developer experience across three product lines.`
  );

export const fixture: ResumeJSON = {
  header: {
    name: "Alexandra Montgomery-Whitfield",
    headline: "Senior Software Engineer · Distributed Systems",
    email: "alexandra.montgomery@example.com",
    phone: "+49 151 2345 6789",
    location: "Berlin, Germany",
    linkedin:
      "https://www.linkedin.com/in/alexandra-montgomery-whitfield-1234567890",
    github: "https://github.com/alexandra-montgomery",
    website: "https://alexandra-montgomery-whitfield.dev",
    workAuthorization: null,
    nationality: null,
    dateOfBirth: null,
    photoDataUrl: null,
  },
  summary:
    "<p>Engineer with 9 years building <strong>high-throughput data platforms</strong> and developer tooling.</p><p>Known for turning ambiguous problems into shipped systems.</p>",
  experience: [
    {
      company: "Acme Corporation International GmbH",
      role: "Staff Software Engineer, Platform Infrastructure",
      startDate: "2022-01",
      endDate: null,
      description:
        "<p>Led a team of 8 engineers owning the event platform.</p>",
      achievements: bullets(5, "Acme"),
    },
    {
      company: "Globex",
      role: "Senior Engineer",
      startDate: "2019-03",
      endDate: "2021-12",
      description: "Owned billing services.",
      achievements: bullets(4, "Globex"),
    },
    {
      company: "Initech",
      role: "Software Engineer",
      startDate: "2016-06",
      endDate: "2019-02",
      description: "Built internal tools.",
      achievements: bullets(3, "Initech"),
    },
  ],
  projects: [
    {
      name: "Open-source distributed rate limiter with a very long descriptive project name",
      description: "A Redis-backed limiter used by 40+ companies.",
      technologies: ["Go", "Redis", "Kubernetes"],
      url: "https://github.com/alexandra-montgomery/very-long-repository-name-rate-limiter",
      startDate: "2023-01",
      endDate: null,
    },
  ],
  skills: [
    { name: "TypeScript", category: "Programming", tier: "primary" },
    { name: "Go", category: "Programming", tier: "primary" },
    { name: "Python", category: "Programming", tier: null },
    { name: "React", category: "Frameworks", tier: null },
    { name: "Kubernetes", category: "Infrastructure", tier: null },
    { name: "PostgreSQL", category: "Infrastructure", tier: null },
    { name: "Kafka", category: "Infrastructure", tier: null },
  ],
  education: [
    {
      institution: "Technische Universität München",
      degree: "M.Sc.",
      field: "Computer Science",
      startDate: "2014-09",
      endDate: "2016-05",
      gpa: "1.3",
    },
    {
      institution: "State University",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2010-09",
      endDate: "2014-05",
      gpa: null,
    },
  ],
  certifications: [
    {
      name: "Certified Kubernetes Administrator",
      issuer: "CNCF",
      date: "2023-04",
      url: "https://cncf.io/cert/123",
    },
  ],
  publications: [
    {
      title: "Backpressure in Practice",
      authors: ["A. Montgomery", "B. Lee"],
      venue: "USENIX ;login:",
      date: "2022-06",
      url: "https://usenix.org/x",
      doi: null,
    },
  ],
  languages: [
    { name: "English", proficiency: "Native" },
    { name: "German", proficiency: "C1" },
    { name: "French", proficiency: "" },
  ],
  volunteer: [
    {
      organization: "Code for Good",
      role: "Mentor",
      startDate: "2021-01",
      endDate: null,
      description: "Mentored bootcamp graduates.",
    },
  ],
  awards: [
    {
      title: "Engineering Excellence Award",
      issuer: "Acme",
      date: "2023-12",
      description: null,
    },
  ],
  hobbies: null,
  sectionLayout: null,
} as unknown as ResumeJSON;
