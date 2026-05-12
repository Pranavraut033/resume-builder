/**
 * ATS Analysis Template
 * Analyzes resume for ATS compatibility and provides optimization recommendations
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const atsTemplate: PromptTemplate = {
  id: "analyze_ats",
  purpose: "analyze_ats",
  description: "Analyze resume for ATS compatibility",

  requiredContext: ["resume", "jobDetails"],

  systemPrompt: `You are a senior ATS (Applicant Tracking System) analyst with deep knowledge of how modern parsers and recruiter screening tools evaluate resumes.

OUTPUT CONTRACT:
- Return ONLY valid JSON matching the ATSAnalysisJSON schema — no markdown, no prose, no explanation

ANALYSIS METHODOLOGY:
Evaluate the resume across four dimensions, in this order:

1. KEYWORD MATCH
   - Extract explicit keywords from the job description: skills, tools, technologies, certifications, job titles, methodologies
   - Classify each as: exact match | semantic match | missing
   - Semantic matches (e.g. "team leadership" vs "led cross-functional teams") count at 70% weight
   - Calculate match percentage: (exact + 0.7 × semantic) / total required keywords × 100

2. ATS FORMATTING RISK
   Flag any of the following as issues with severity (high / medium / low):
   - Non-standard section headings (high)
   - Tables, columns, text boxes, or inferred graphics (high)
   - Headers/footers containing critical info (high)
   - Special characters or unicode symbols in body text (medium)
   - Acronyms not spelled out on first use (medium)
   - Dates in non-standard formats (medium)
   - Missing standard sections: Summary, Experience, Education, Skills (high)
   - Job titles that don't mirror industry-standard terminology (low)

3. CONTENT QUALITY SIGNALS
   Assess what ATS scoring layers and recruiters look for after parsing:
   - Quantified achievements vs. vague duty descriptions
   - Action verb strength and variety
   - Recency and relevance of experience to the role
   - Keyword density — flag both under-use and over-stuffing

4. SCORING
   Compute a composite ATS score (0–100):
   - Keyword match: 45%
   - Formatting compliance: 30%
   - Content quality signals: 25%
   Break down sub-scores for each dimension.

IMPROVEMENT RECOMMENDATIONS:
- Rank improvements by expected score delta (highest impact first)
- Be surgical: reference the exact resume section and the specific change needed
- Do not suggest adding experience or skills not present in the resume`,

  userPrompt: `Perform a full ATS analysis for the {{jobDetails.job.job_title}} role at {{jobDetails.job.company.company_name}}.

TARGET JOB:
{{{json jobDetails}}}

CANDIDATE RESUME:
{{{json resume}}}

INSTRUCTIONS:
1. Parse the job description for all required and preferred keywords — skills, tools, titles, certifications, methodologies
2. Cross-reference each keyword against the resume; classify as exact, semantic, or missing
3. Scan the resume structure for ATS formatting risks using the severity rubric
4. Assess content quality: quantification rate, action verb quality, relevance ordering
5. Compute sub-scores and composite score
6. Generate prioritized improvements — each must name the target section, the problem, and the specific fix

OUTPUT REQUIREMENTS:
- keyword_analysis: full list of job keywords, each with match_type and match_status
- missing_keywords: only those absent from the resume entirely
- formatting_issues: each with section, description, and severity
- scores: keyword_match_score, formatting_score, content_quality_score, composite_score (all 0–100)
- improvements: ranked array, each with section, issue, recommended_fix, and estimated_score_delta
- summary: 2–3 sentence plain-language verdict on the resume's ATS readiness for this role

HARD CONSTRAINTS:
- Base all keyword matches on what is actually in the resume — no assumptions
- Do not recommend adding fabricated experience or skills
- Score calibration: a perfect resume for the exact role = 95 (reserve 100 as theoretical ceiling)

Return ONLY valid JSON matching the ATSAnalysisJSON schema.`,
};

// Auto-register on module load
templateRegistry.register(atsTemplate);

export default atsTemplate;
