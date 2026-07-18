"use client";

import { useState } from "react";

import { TagsEditor } from "@/components/form/TagsEditor";
import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skill } from "@/types/resume";

interface SkillsSectionProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
}

/** Group skills by category, preserving first-seen category order. Skills
 * without a category are collected under a single implicit trailing group
 * (represented with `category: null`). */
function groupByCategory(
  skills: Skill[]
): { category: string | null; skills: Skill[] }[] {
  const order: (string | null)[] = [];
  const groups = new Map<string | null, Skill[]>();

  for (const skill of skills) {
    const key = skill.category?.trim() ? skill.category : null;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(skill);
  }

  return order.map((category) => ({ category, skills: groups.get(category)! }));
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [newCategory, setNewCategory] = useState("");
  // Categories the user has created locally but that don't have any skills
  // yet, so their (empty) TagsEditor stays visible until populated.
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);

  const groups = groupByCategory(skills);
  const existingCategoryNames = new Set(
    groups.map((g) => g.category).filter((c): c is string => c !== null)
  );
  const emptyGroups = pendingCategories
    .filter((c) => !existingCategoryNames.has(c))
    .map((category) => ({ category, skills: [] as Skill[] }));

  const allGroups = [...groups, ...emptyGroups];

  /** Replace the full skill list for one category group, leaving all other
   * groups' skills untouched. */
  const replaceCategoryGroup = (
    category: string | null,
    nextSkills: Skill[]
  ) => {
    const otherSkills = skills.filter((s) => {
      const key = s.category?.trim() ? s.category : null;
      return key !== category;
    });
    onChange([...otherSkills, ...nextSkills]);
  };

  const handleTagsChange = (category: string | null, names: string[]) => {
    const currentGroup = groups.find((g) => g.category === category);
    const byName = new Map(
      (currentGroup?.skills ?? []).map((s) => [s.name, s])
    );
    const nextSkills: Skill[] = names.map(
      (name) => byName.get(name) ?? { name, category: category ?? undefined }
    );
    replaceCategoryGroup(category, nextSkills);
  };

  const toggleTier = (category: string | null, skillName: string) => {
    const currentGroup = groups.find((g) => g.category === category);
    if (!currentGroup) return;
    const nextSkills = currentGroup.skills.map((s) =>
      s.name === skillName
        ? {
            ...s,
            tier: s.tier === "primary" ? undefined : ("primary" as const),
          }
        : s
    );
    replaceCategoryGroup(category, nextSkills);
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (
      !existingCategoryNames.has(trimmed) &&
      !pendingCategories.includes(trimmed)
    ) {
      setPendingCategories((prev) => [...prev, trimmed]);
    }
    setNewCategory("");
  };

  return (
    <PageSection title="Skills">
      <SurfacePanel>
        <div className="space-y-6">
          {allGroups.length === 0 && (
            <p className="text-agent-on-surface-variant text-sm">
              No skills added yet.
            </p>
          )}

          {allGroups.map(({ category, skills: groupSkills }) => (
            <div
              key={category ?? "__uncategorized__"}
              className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
            >
              <TagsEditor
                label={category ?? "Skills"}
                tags={groupSkills.map((s) => s.name)}
                onTagsChange={(names) => handleTagsChange(category, names)}
                placeholder="Add a skill and press Enter"
              />

              {groupSkills.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-agent-on-surface-variant text-xs">
                    Click a skill to mark it as primary (bold, highlighted first
                    on the resume).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groupSkills.map((skill) => {
                      const isPrimary = skill.tier === "primary";
                      return (
                        <button
                          key={skill.name}
                          type="button"
                          onClick={() => toggleTier(category, skill.name)}
                          title={
                            isPrimary
                              ? "Primary skill (click to unmark)"
                              : "Mark as primary"
                          }
                          className={
                            isPrimary
                              ? "bg-agent-primary text-agent-surface-lowest inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                              : "border-agent-outline-variant text-agent-on-surface-variant inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
                          }
                        >
                          {isPrimary && (
                            <Icon
                              name="star"
                              className="h-3 w-3 fill-current"
                            />
                          )}
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="border-agent-outline-variant flex flex-wrap items-center gap-2 border-t pt-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="New category name"
              className="border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
            <Button variant="secondary" size="sm" onClick={handleAddCategory}>
              + Add category
            </Button>
          </div>
        </div>
      </SurfacePanel>
    </PageSection>
  );
}
