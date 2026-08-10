// Types for the mock interview feature

export type InterviewTurn = {
  role: "interviewer" | "candidate";
  text: string;
  at: string;
};

export type InterviewTranscriptJSON = InterviewTurn[];

export type InterviewFeedbackJSON = {
  summary: string;
  strengths: string[];
  improvements: string[];
};
