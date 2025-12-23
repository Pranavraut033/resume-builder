'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { generateResumePDF } from '@/lib/pdfExport';
import { generateResumeTXT } from '@/lib/txtExport';
import { backupToGoogleDrive } from '@/lib/backup';
import { ResumeJSON, ContactInfo } from '@/types/resume';
import { Button, Modal, Section, SortableSection, Card, FormField, Icon } from './ui';

const defaultResume: ResumeJSON = {
  header: {
    name: 'Your Name',
    email: 'your.email@example.com',
    phone: '(555) 123-4567',
    location: 'City, State',
    linkedin: 'linkedin.com/in/yourprofile',
    github: 'github.com/yourusername',
    website: 'yourwebsite.com'
  },
  summary: 'A passionate software developer with 5+ years of experience building web applications. Skilled in React, Node.js, and cloud technologies.',
  experience: [
    {
      company: 'Tech Company Inc.',
      role: 'Senior Software Engineer',
      startDate: '2022-01',
      endDate: 'Present',
      description: 'Led development of scalable web applications serving 100k+ users.',
      achievements: [
        'Improved application performance by 40% through code optimization',
        'Mentored junior developers and established coding standards',
        'Implemented CI/CD pipeline reducing deployment time by 60%'
      ]
    }
  ],
  projects: [
    {
      name: 'E-commerce Platform',
      description: 'Full-stack e-commerce solution with React and Node.js',
      technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'],
      url: 'https://github.com/yourusername/ecommerce',
      startDate: '2023-06',
      endDate: '2023-12'
    }
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2018-09',
      endDate: '2022-05',
      gpa: '3.8'
    }
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023-03',
      url: 'https://aws.amazon.com/certification/'
    }
  ]
};

export default function ResumeEditor({ jobId }: { jobId: string }) {
  const [resume, setResume] = useState<ResumeJSON>(defaultResume);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'header', 'summary', 'experience', 'projects', 'skills', 'education', 'certifications'
  ]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<unknown>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadResume = async () => {
      try {
        const { getResumeByJobId } = await import('@/actions/job');
        const data = await getResumeByJobId(parseInt(jobId));
        if (data) {
          setResume(data);
        }
      } catch (error) {
        console.error('Error loading resume:', error);
      }
    };
    loadResume();
  }, [jobId]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleExportPDF() {
    if (!resume) return;
    generateResumePDF(resume);
  }

  function handleExportTXT() {
    if (!resume) return;
    generateResumeTXT(resume);
  }

  function handleBackup() {
    if (!resume) return;
    backupToGoogleDrive(JSON.stringify(resume));
  }

  function updateResume(updates: Partial<ResumeJSON>) {
    if (!resume) return;
    setResume({ ...resume, ...updates });
  }

  function updateHeader(updates: Partial<ContactInfo>) {
    if (!resume) return;
    setResume({
      ...resume,
      header: { ...resume.header, ...updates }
    });
  }

  function startEditing(section: string, data?: unknown) {
    setEditingSection(section);
    setEditingData(data || null);
  }

  function cancelEditing() {
    setEditingSection(null);
    setEditingData(null);
  }

  function saveEditing() {
    if (!resume || !editingSection) return;

    switch (editingSection) {
      case 'header':
        updateHeader(editingData as Partial<ContactInfo>);
        break;
      case 'summary':
        updateResume({ summary: editingData as string });
        break;
      case 'experience':
        // Handle experience editing
        break;
      case 'projects':
        // Handle projects editing
        break;
      case 'skills':
        updateResume({ skills: editingData as string[] });
        break;
      case 'education':
        // Handle education editing
        break;
      case 'certifications':
        // Handle certifications editing
        break;
    }

    setEditingSection(null);
    setEditingData(null);
  }

  if (!resume) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading resume...</p>
      </div>
    </div>
  );

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'header':
        return (
          <Section title="Contact Information" onEdit={() => startEditing('header', resume.header)}>
            <Card>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{resume.header.name}</h1>
              <div className="space-y-1 text-gray-600">
                <p>📧 {resume.header.email}</p>
                {resume.header.phone && <p>📱 {resume.header.phone}</p>}
                {resume.header.location && <p>📍 {resume.header.location}</p>}
                {resume.header.linkedin && <p>💼 {resume.header.linkedin}</p>}
                {resume.header.github && <p>💻 {resume.header.github}</p>}
                {resume.header.website && <p>🌐 {resume.header.website}</p>}
              </div>
            </Card>
          </Section>
        );

      case 'summary':
        return (
          <Section title="Professional Summary" onEdit={() => startEditing('summary', resume.summary)}>
            <Card>
              <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
            </Card>
          </Section>
        );

      case 'experience':
        return (
          <Section title="Work Experience">
            <div className="space-y-6">
              {resume.experience.map((exp, index) => (
                <Card key={index}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{exp.role}</h3>
                      <p className="text-lg text-blue-600 font-medium">{exp.company}</p>
                    </div>
                    <div className="text-right text-gray-600">
                      <p>{exp.startDate} - {exp.endDate || 'Present'}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{exp.description}</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {exp.achievements.map((achievement, i) => (
                      <li key={i}>{achievement}</li>
                    ))}
                  </ul>
                </Card>
              ))}
              <Button variant="ghost" icon={<Icon name="plus" />}>
                Add Experience
              </Button>
            </div>
          </Section>
        );

      case 'projects':
        return (
          <Section title="Projects">
            <div className="space-y-6">
              {resume.projects.map((project, index) => (
                <Card key={index}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
                    <div className="text-right text-gray-600 text-sm">
                      {project.startDate} - {project.endDate}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                  {project.url && (
                    <a href={project.url} className="text-blue-600 hover:underline mt-2 inline-block">
                      View Project →
                    </a>
                  )}
                </Card>
              ))}
              <Button variant="ghost" icon={<Icon name="plus" />}>
                Add Project
              </Button>
            </div>
          </Section>
        );

      case 'skills':
        return (
          <Section title="Skills" onEdit={() => startEditing('skills', [...resume.skills])}>
            <Card>
              <div className="flex flex-wrap gap-3">
                {resume.skills.map((skill, index) => (
                  <span key={index} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          </Section>
        );

      case 'education':
        return (
          <Section title="Education">
            <div className="space-y-6">
              {resume.education.map((edu, index) => (
                <Card key={index}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{edu.degree} in {edu.field}</h3>
                      <p className="text-lg text-blue-600 font-medium">{edu.institution}</p>
                    </div>
                    <div className="text-right text-gray-600">
                      <p>{edu.startDate} - {edu.endDate}</p>
                      {edu.gpa && <p>GPA: {edu.gpa}</p>}
                    </div>
                  </div>
                </Card>
              ))}
              <Button variant="ghost" icon={<Icon name="plus" />}>
                Add Education
              </Button>
            </div>
          </Section>
        );

      case 'certifications':
        return (
          <Section title="Certifications">
            <div className="space-y-4">
              {resume.certifications.map((cert, index) => (
                <Card key={index}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{cert.name}</h3>
                      <p className="text-blue-600">{cert.issuer}</p>
                    </div>
                    <div className="text-right text-gray-600">
                      <p>{cert.date}</p>
                      {cert.url && (
                        <a href={cert.url} className="text-blue-600 hover:underline text-sm">
                          View Certificate →
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              <Button variant="ghost" icon={<Icon name="plus" />}>
                Add Certification
              </Button>
            </div>
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Resume Editor</h1>
          <div className="flex gap-3">
            <Button
              onClick={handleExportPDF}
              variant="secondary"
              icon={<Icon name="download" />}
            >
              Export PDF
            </Button>
            <Button
              onClick={handleExportTXT}
              variant="secondary"
              icon={<Icon name="fileText" />}
            >
              Export TXT
            </Button>
            <Button
              onClick={handleBackup}
              variant="secondary"
              icon={<Icon name="cloud" />}
            >
              Backup
            </Button>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white shadow-lg rounded-lg p-8 min-h-[29.7cm]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map((sectionId) => (
                <SortableSection key={sectionId} id={sectionId}>
                  {renderSection(sectionId)}
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editingSection !== null}
        onClose={cancelEditing}
        onSave={saveEditing}
        title={`Edit ${editingSection?.charAt(0).toUpperCase()}${editingSection?.slice(1)}`}
      >
        {editingSection === 'header' && editingData !== null && (
          <div className="space-y-4">
            <FormField
              label="Full Name"
              type="text"
              value={(editingData as ContactInfo).name || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), name: value })}
            />
            <FormField
              label="Email"
              type="email"
              value={(editingData as ContactInfo).email || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), email: value })}
            />
            <FormField
              label="Phone"
              type="tel"
              value={(editingData as ContactInfo).phone || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), phone: value })}
            />
            <FormField
              label="Location"
              type="text"
              value={(editingData as ContactInfo).location || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), location: value })}
            />
            <FormField
              label="LinkedIn"
              type="url"
              value={(editingData as ContactInfo).linkedin || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), linkedin: value })}
            />
            <FormField
              label="GitHub"
              type="url"
              value={(editingData as ContactInfo).github || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), github: value })}
            />
            <FormField
              label="Website"
              type="url"
              value={(editingData as ContactInfo).website || ''}
              onChange={(value) => setEditingData({ ...(editingData as ContactInfo), website: value })}
            />
          </div>
        )}

        {editingSection === 'summary' && (
          <FormField
            label="Professional Summary"
            type="textarea"
            value={(editingData as string) || ''}
            onChange={setEditingData}
            placeholder="Write a compelling summary of your professional background..."
          />
        )}

        {editingSection === 'skills' && Array.isArray(editingData) && (
          <FormField
            label="Skills (one per line)"
            type="textarea"
            value={editingData.join('\n')}
            onChange={(value) => setEditingData(value.split('\n').filter(skill => skill.trim()))}
            placeholder="JavaScript&#10;React&#10;Node.js&#10;TypeScript"
          />
        )}
      </Modal>
    </div>
  );
}