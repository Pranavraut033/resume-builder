"use client";

import { useState, useEffect } from "react";

import { getProfile, saveProfile } from "@/actions/profile";
import { ModelSelector } from "@/components/ModelSelector";
import { ProfileActionButtons } from "@/components/ProfileActionButtons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Section } from "@/components/ui/Section";
import { parseResume } from "@/lib/llm/clientLLM";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import {
  ResumeJSON,
  Experience,
  Project,
  Education,
  Certification,
  Publication,
  Language,
  Volunteer,
  Award,
} from "@/types/resume";

const logger = createLogger("ProfilePage");

export default function ProfilePage() {
  const [profile, setProfile] = useState<ResumeJSON>({
    header: {
      name: "",
      email: "",
      phone: null,
      location: null,
      linkedin: null,
      github: null,
      website: null,
    },
    summary: "",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    publications: [],
    languages: [],
    volunteer: [],
    awards: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [importingJson, setImportingJson] = useState(false);

  const { loadModels, selectedModelsByProvider, selectedProvider } =
    useModelStore();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (error) {
        logger.error("Error loading profile", { error });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile(profile);
      alert("Profile saved!");
    } catch (error) {
      logger.error("Error saving profile", { error });
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImportResume = async () => {
    if (!resumeText.trim()) {
      alert("Please paste your resume text");
      return;
    }

    const selectedModel = selectedModelsByProvider[selectedProvider]?.[0];
    if (!selectedModel) {
      alert("Please select a model first");
      return;
    }

    setImporting(true);
    try {
      const parsed = await parseResume(resumeText, selectedModel, "openai");
      setProfile(parsed);
      setShowImportModal(false);
      setResumeText("");
      alert("Resume imported successfully! Review and save your profile.");
    } catch (error) {
      logger.error("Error parsing resume", { error });
      alert(
        "Error parsing resume. Please make sure you have OpenAI API key configured."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonString = JSON.stringify(profile, null, 2);
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(jsonString)
      );
      element.setAttribute(
        "download",
        `profile-${new Date().toISOString().split("T")[0]}.json`
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      logger.error("Error exporting profile", { error });
      alert("Error exporting profile");
    }
  };

  const handleImportJSON = async () => {
    if (!jsonText.trim()) {
      alert("Please paste your profile JSON");
      return;
    }

    setImportingJson(true);
    try {
      const parsed = JSON.parse(jsonText) as ResumeJSON;
      setProfile(parsed);
      setShowImportJsonModal(false);
      setJsonText("");
      alert("Profile imported successfully! Review and save your profile.");
    } catch (error) {
      logger.error("Error parsing JSON", { error });
      alert(
        "Error parsing JSON. Please make sure the format is valid profile JSON."
      );
    } finally {
      setImportingJson(false);
    }
  };

  const addExperience = () => {
    setProfile({
      ...profile,
      experience: [
        ...profile.experience,
        {
          company: "",
          role: "",
          startDate: "",
          endDate: "",
          description: "",
          achievements: [],
        },
      ],
    });
  };

  const updateExperience = (index: number, exp: Experience) => {
    const updated = [...profile.experience];
    updated[index] = exp;
    setProfile({ ...profile, experience: updated });
  };

  const removeExperience = (index: number) => {
    setProfile({
      ...profile,
      experience: profile.experience.filter((_, i) => i !== index),
    });
  };

  const addProject = () => {
    setProfile({
      ...profile,
      projects: [
        ...profile.projects,
        {
          name: "",
          description: "",
          technologies: [],
          url: null,
          startDate: null,
          endDate: null,
        },
      ],
    });
  };

  const updateProject = (index: number, proj: Project) => {
    const updated = [...profile.projects];
    updated[index] = proj;
    setProfile({ ...profile, projects: updated });
  };

  const removeProject = (index: number) => {
    setProfile({
      ...profile,
      projects: profile.projects.filter((_, i) => i !== index),
    });
  };

  const addEducation = () => {
    setProfile({
      ...profile,
      education: [
        ...profile.education,
        {
          institution: "",
          degree: "",
          field: "",
          startDate: "",
          endDate: null,
          gpa: null,
        },
      ],
    });
  };

  const updateEducation = (index: number, edu: Education) => {
    const updated = [...profile.education];
    updated[index] = edu;
    setProfile({ ...profile, education: updated });
  };

  const removeEducation = (index: number) => {
    setProfile({
      ...profile,
      education: profile.education.filter((_, i) => i !== index),
    });
  };

  const addCertification = () => {
    setProfile({
      ...profile,
      certifications: [
        ...profile.certifications,
        { name: "", issuer: "", date: "", url: null },
      ],
    });
  };

  const updateCertification = (index: number, cert: Certification) => {
    const updated = [...profile.certifications];
    updated[index] = cert;
    setProfile({ ...profile, certifications: updated });
  };

  const removeCertification = (index: number) => {
    setProfile({
      ...profile,
      certifications: profile.certifications.filter((_, i) => i !== index),
    });
  };

  const addPublication = () => {
    setProfile({
      ...profile,
      publications: [
        ...(profile.publications || []),
        { title: "", authors: [], venue: "", date: "", url: null, doi: null },
      ],
    });
  };

  const updatePublication = (index: number, pub: Publication) => {
    const updated = [...(profile.publications || [])];
    updated[index] = pub;
    setProfile({ ...profile, publications: updated });
  };

  const removePublication = (index: number) => {
    setProfile({
      ...profile,
      publications: (profile.publications || []).filter((_, i) => i !== index),
    });
  };

  const addLanguage = () => {
    setProfile({
      ...profile,
      languages: [...(profile.languages || []), { name: "", proficiency: "" }],
    });
  };

  const updateLanguage = (index: number, lang: Language) => {
    const updated = [...(profile.languages || [])];
    updated[index] = lang;
    setProfile({ ...profile, languages: updated });
  };

  const removeLanguage = (index: number) => {
    setProfile({
      ...profile,
      languages: (profile.languages || []).filter((_, i) => i !== index),
    });
  };

  const addVolunteer = () => {
    setProfile({
      ...profile,
      volunteer: [
        ...(profile.volunteer || []),
        {
          organization: "",
          role: "",
          startDate: "",
          endDate: null,
          description: "",
        },
      ],
    });
  };

  const updateVolunteer = (index: number, vol: Volunteer) => {
    const updated = [...(profile.volunteer || [])];
    updated[index] = vol;
    setProfile({ ...profile, volunteer: updated });
  };

  const removeVolunteer = (index: number) => {
    setProfile({
      ...profile,
      volunteer: (profile.volunteer || []).filter((_, i) => i !== index),
    });
  };

  const addAward = () => {
    setProfile({
      ...profile,
      awards: [
        ...(profile.awards || []),
        { title: "", issuer: "", date: "", description: null },
      ],
    });
  };

  const updateAward = (index: number, award: Award) => {
    const updated = [...(profile.awards || [])];
    updated[index] = award;
    setProfile({ ...profile, awards: updated });
  };

  const removeAward = (index: number) => {
    setProfile({
      ...profile,
      awards: (profile.awards || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Base Profile</h1>
        <ProfileActionButtons
          onImportResume={() => setShowImportModal(true)}
          onImportJSON={() => setShowImportJsonModal(true)}
          onExportJSON={handleExportJSON}
          onSave={handleSave}
          isSaving={saving}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Header / Contact Information */}
          <Card>
            <Section title="Contact Information">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Full Name"
                  value={profile.header.name}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, name: v },
                    })
                  }
                  placeholder="John Doe"
                />

                <FormField
                  label="Email"
                  type="email"
                  value={profile.header.email}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, email: v },
                    })
                  }
                  placeholder="john@example.com"
                />

                <FormField
                  label="Phone"
                  value={profile.header.phone || ""}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, phone: v },
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                />

                <FormField
                  label="Location"
                  value={profile.header.location || ""}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, location: v },
                    })
                  }
                  placeholder="San Francisco, CA"
                />

                <FormField
                  label="LinkedIn"
                  value={profile.header.linkedin || ""}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, linkedin: v },
                    })
                  }
                  placeholder="linkedin.com/in/johndoe"
                />

                <FormField
                  label="GitHub"
                  value={profile.header.github || ""}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, github: v },
                    })
                  }
                  placeholder="github.com/johndoe"
                />

                <FormField
                  label="Website"
                  value={profile.header.website || ""}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      header: { ...profile.header, website: v },
                    })
                  }
                  placeholder="johndoe.com"
                />
              </div>
            </Section>
          </Card>

          {/* Professional Summary */}
          <Card>
            <Section title="Professional Summary">
              <FormField
                type="textarea"
                value={profile.summary}
                onChange={(v) => setProfile({ ...profile, summary: v })}
                rows={5}
                placeholder="Write a brief summary of your professional background and career goals..."
              />
            </Section>
          </Card>

          {/* Skills */}
          <Card>
            <Section title="Skills">
              <FormField
                type="textarea"
                value={profile.skills.join(", ")}
                onChange={(v) =>
                  setProfile({
                    ...profile,
                    skills: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                rows={3}
                placeholder="JavaScript, TypeScript, React, Node.js, Python, etc."
                helpText="Comma-separated list of skills"
              />
            </Section>
          </Card>

          {/* Experience */}
          <Card>
            <Section
              title="Work Experience"
              actions={
                <Button variant="secondary" size="sm" onClick={addExperience}>
                  + Add Experience
                </Button>
              }
            >
              {profile.experience.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No experience added yet. Click &quot;Add Experience&quot; to
                  get started.
                </p>
              ) : (
                <div className="space-y-6">
                  {profile.experience.map((exp, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Experience {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeExperience(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Company"
                          value={exp.company}
                          onChange={(v) =>
                            updateExperience(index, { ...exp, company: v })
                          }
                        />
                        <FormField
                          label="Role"
                          value={exp.role}
                          onChange={(v) =>
                            updateExperience(index, { ...exp, role: v })
                          }
                        />
                        <FormField
                          label="Start Date"
                          value={exp.startDate}
                          onChange={(v) =>
                            updateExperience(index, { ...exp, startDate: v })
                          }
                          placeholder="Jan 2020"
                        />
                        <FormField
                          label="End Date"
                          value={exp.endDate || ""}
                          onChange={(v) =>
                            updateExperience(index, { ...exp, endDate: v })
                          }
                          placeholder="Present or Dec 2022"
                        />
                      </div>
                      <FormField
                        label="Description"
                        type="textarea"
                        value={exp.description}
                        onChange={(v) =>
                          updateExperience(index, { ...exp, description: v })
                        }
                        rows={3}
                      />
                      <FormField
                        label="Achievements"
                        type="textarea"
                        value={exp.achievements.join("\n")}
                        onChange={(v) =>
                          updateExperience(index, {
                            ...exp,
                            achievements: v.split("\n").filter(Boolean),
                          })
                        }
                        rows={3}
                        helpText="One achievement per line"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Projects */}
          <Card>
            <Section
              title="Projects"
              actions={
                <Button variant="secondary" size="sm" onClick={addProject}>
                  + Add Project
                </Button>
              }
            >
              {profile.projects.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No projects added yet. Click &quot;Add Project&quot; to get
                  started.
                </p>
              ) : (
                <div className="space-y-6">
                  {profile.projects.map((proj, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Project {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeProject(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <FormField
                        label="Project Name"
                        value={proj.name}
                        onChange={(v) =>
                          updateProject(index, { ...proj, name: v })
                        }
                      />
                      <FormField
                        label="Description"
                        type="textarea"
                        value={proj.description}
                        onChange={(v) =>
                          updateProject(index, { ...proj, description: v })
                        }
                        rows={3}
                      />
                      <FormField
                        label="Technologies"
                        value={proj.technologies.join(", ")}
                        onChange={(v) =>
                          updateProject(index, {
                            ...proj,
                            technologies: v
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        helpText="Comma-separated list"
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="URL"
                          value={proj.url || ""}
                          onChange={(v) =>
                            updateProject(index, { ...proj, url: v })
                          }
                          placeholder="https://github.com/..."
                        />
                        <FormField
                          label="Start Date"
                          value={proj.startDate || ""}
                          onChange={(v) =>
                            updateProject(index, { ...proj, startDate: v })
                          }
                          placeholder="Jan 2023"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Education */}
          <Card>
            <Section
              title="Education"
              actions={
                <Button variant="secondary" size="sm" onClick={addEducation}>
                  + Add Education
                </Button>
              }
            >
              {profile.education.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No education added yet. Click &quot;Add Education&quot; to get
                  started.
                </p>
              ) : (
                <div className="space-y-6">
                  {profile.education.map((edu, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Education {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeEducation(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <FormField
                        label="Institution"
                        value={edu.institution}
                        onChange={(v) =>
                          updateEducation(index, { ...edu, institution: v })
                        }
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Degree"
                          value={edu.degree}
                          onChange={(v) =>
                            updateEducation(index, { ...edu, degree: v })
                          }
                          placeholder="Bachelor of Science"
                        />
                        <FormField
                          label="Field of Study"
                          value={edu.field}
                          onChange={(v) =>
                            updateEducation(index, { ...edu, field: v })
                          }
                          placeholder="Computer Science"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <FormField
                          label="Start Date"
                          value={edu.startDate}
                          onChange={(v) =>
                            updateEducation(index, { ...edu, startDate: v })
                          }
                          placeholder="2015"
                        />
                        <FormField
                          label="End Date"
                          value={edu.endDate || ""}
                          onChange={(v) =>
                            updateEducation(index, { ...edu, endDate: v })
                          }
                          placeholder="2019"
                        />
                        <FormField
                          label="GPA"
                          value={edu.gpa || ""}
                          onChange={(v) =>
                            updateEducation(index, { ...edu, gpa: v })
                          }
                          placeholder="3.8/4.0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Certifications */}
          <Card>
            <Section
              title="Certifications"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addCertification}
                >
                  + Add Certification
                </Button>
              }
            >
              {profile.certifications.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No certifications added yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {profile.certifications.map((cert, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">
                          Certification {index + 1}
                        </h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeCertification(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <FormField
                        label="Certification Name"
                        value={cert.name}
                        onChange={(v) =>
                          updateCertification(index, { ...cert, name: v })
                        }
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Issuer"
                          value={cert.issuer}
                          onChange={(v) =>
                            updateCertification(index, { ...cert, issuer: v })
                          }
                        />
                        <FormField
                          label="Date"
                          value={cert.date}
                          onChange={(v) =>
                            updateCertification(index, { ...cert, date: v })
                          }
                          placeholder="Jan 2023"
                        />
                      </div>
                      <FormField
                        label="URL"
                        value={cert.url || ""}
                        onChange={(v) =>
                          updateCertification(index, { ...cert, url: v })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Publications (Optional) */}
          <Card>
            <Section
              title="Publications (Optional)"
              actions={
                <Button variant="secondary" size="sm" onClick={addPublication}>
                  + Add Publication
                </Button>
              }
            >
              {(profile.publications || []).length === 0 ? (
                <p className="text-sm text-gray-500">
                  No publications added yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {(profile.publications || []).map((pub, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Publication {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removePublication(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <FormField
                        label="Title"
                        value={pub.title}
                        onChange={(v) =>
                          updatePublication(index, { ...pub, title: v })
                        }
                      />
                      <FormField
                        label="Authors"
                        value={pub.authors.join(", ")}
                        onChange={(v) =>
                          updatePublication(index, {
                            ...pub,
                            authors: v
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        helpText="Comma-separated list"
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Venue"
                          value={pub.venue}
                          onChange={(v) =>
                            updatePublication(index, { ...pub, venue: v })
                          }
                          placeholder="Journal/Conference name"
                        />
                        <FormField
                          label="Date"
                          value={pub.date}
                          onChange={(v) =>
                            updatePublication(index, { ...pub, date: v })
                          }
                          placeholder="2023"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="URL"
                          value={pub.url || ""}
                          onChange={(v) =>
                            updatePublication(index, { ...pub, url: v })
                          }
                        />
                        <FormField
                          label="DOI"
                          value={pub.doi || ""}
                          onChange={(v) =>
                            updatePublication(index, { ...pub, doi: v })
                          }
                          placeholder="10.1234/example"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Languages (Optional) */}
          <Card>
            <Section
              title="Languages (Optional)"
              actions={
                <Button variant="secondary" size="sm" onClick={addLanguage}>
                  + Add Language
                </Button>
              }
            >
              {(profile.languages || []).length === 0 ? (
                <p className="text-sm text-gray-500">No languages added yet.</p>
              ) : (
                <div className="space-y-4">
                  {(profile.languages || []).map((lang, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Language {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeLanguage(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Language"
                          value={lang.name}
                          onChange={(v) =>
                            updateLanguage(index, { ...lang, name: v })
                          }
                          placeholder="English"
                        />
                        <FormField
                          label="Proficiency"
                          value={lang.proficiency}
                          onChange={(v) =>
                            updateLanguage(index, { ...lang, proficiency: v })
                          }
                          placeholder="Native, Fluent, Professional, etc."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Volunteer Work (Optional) */}
          <Card>
            <Section
              title="Volunteer Work (Optional)"
              actions={
                <Button variant="secondary" size="sm" onClick={addVolunteer}>
                  + Add Volunteer Work
                </Button>
              }
            >
              {(profile.volunteer || []).length === 0 ? (
                <p className="text-sm text-gray-500">
                  No volunteer work added yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {(profile.volunteer || []).map((vol, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Volunteer {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeVolunteer(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <FormField
                        label="Organization"
                        value={vol.organization}
                        onChange={(v) =>
                          updateVolunteer(index, { ...vol, organization: v })
                        }
                      />
                      <FormField
                        label="Role"
                        value={vol.role}
                        onChange={(v) =>
                          updateVolunteer(index, { ...vol, role: v })
                        }
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Start Date"
                          value={vol.startDate}
                          onChange={(v) =>
                            updateVolunteer(index, { ...vol, startDate: v })
                          }
                        />
                        <FormField
                          label="End Date"
                          value={vol.endDate || ""}
                          onChange={(v) =>
                            updateVolunteer(index, { ...vol, endDate: v })
                          }
                        />
                      </div>
                      <FormField
                        label="Description"
                        type="textarea"
                        value={vol.description}
                        onChange={(v) =>
                          updateVolunteer(index, { ...vol, description: v })
                        }
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Awards (Optional) */}
          <Card>
            <Section
              title="Awards & Honors (Optional)"
              actions={
                <Button variant="secondary" size="sm" onClick={addAward}>
                  + Add Award
                </Button>
              }
            >
              {(profile.awards || []).length === 0 ? (
                <p className="text-sm text-gray-500">No awards added yet.</p>
              ) : (
                <div className="space-y-6">
                  {(profile.awards || []).map((award, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Award {index + 1}</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeAward(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <FormField
                        label="Award Title"
                        value={award.title}
                        onChange={(v) =>
                          updateAward(index, { ...award, title: v })
                        }
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                          label="Issuer"
                          value={award.issuer}
                          onChange={(v) =>
                            updateAward(index, { ...award, issuer: v })
                          }
                        />
                        <FormField
                          label="Date"
                          value={award.date}
                          onChange={(v) =>
                            updateAward(index, { ...award, date: v })
                          }
                        />
                      </div>
                      <FormField
                        label="Description"
                        type="textarea"
                        value={award.description || ""}
                        onChange={(v) =>
                          updateAward(index, { ...award, description: v })
                        }
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          {/* Save Actions */}
          <Card>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Reset
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Import Resume Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Resume"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Paste your resume text below. The AI will extract structured
            information to populate your profile.
          </p>

          <ModelSelector onModelSelected={() => {}} className="mb-4" />

          <p className="mt-2 text-xs text-gray-500">
            Note: Resume parsing is currently only supported with OpenAI models.
          </p>

          <div>
            <label
              htmlFor="resumeText"
              className="mb-2 block text-sm font-medium"
            >
              Resume Text
            </label>
            <textarea
              id="resumeText"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="h-96 w-full rounded border p-3 font-mono text-sm"
              placeholder="Paste your resume text here..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImportResume}
              disabled={importing || !resumeText.trim()}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import JSON Modal */}
      <Modal
        isOpen={showImportJsonModal}
        onClose={() => setShowImportJsonModal(false)}
        title="Import Profile from JSON"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Paste your profile JSON below to import it. This will replace your
            current profile.
          </p>

          <div>
            <label
              htmlFor="jsonText"
              className="mb-2 block text-sm font-medium"
            >
              Profile JSON
            </label>
            <textarea
              id="jsonText"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="h-96 w-full rounded border p-3 font-mono text-sm"
              placeholder="Paste your profile JSON here..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowImportJsonModal(false)}
              disabled={importingJson}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImportJSON}
              disabled={importingJson || !jsonText.trim()}
            >
              {importingJson ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
