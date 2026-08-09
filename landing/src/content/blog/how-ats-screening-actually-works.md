---
title: "How ATS resume screening actually works — and what it means for your resume"
description: "How applicant tracking systems actually parse, store, and surface resumes — why \"the ATS rejected me\" usually isn't what happened, and what to do instead."
pubDate: 2026-08-11
tags: ["ats", "guide"]
draft: true
---

Most advice about applicant tracking systems is written by people selling you something to
beat them. It shows. You've probably read that a robot scores your resume, that a hidden
algorithm rejects you in seconds, and that the fix is a particular font or a magic
keyword density.

Almost none of that is how it works.

An applicant tracking system (ATS) is a database with a search box. It's the
software a company uses to receive applications, store them, and let recruiters find
people in the pile. That's the whole job. Understanding what it actually does — and what
it genuinely can't do — changes what's worth your effort when you tailor a resume to a job
description, and it retires about half the advice you've been given.

Here's what happens to your resume after you hit submit.

## Step one: your resume gets parsed into fields

When your file arrives, the system tries to convert it from a document into structured
data. Name here, email there, a list of jobs with employers and date ranges, a list of
schools, a block of skills.

This is the step people mean when they say a resume is "ATS-friendly," and it's the one
step where formatting genuinely matters. Parsers are ordinary software doing a hard job:
reading a layout designed for human eyes and guessing which text is a job title and which
is a company name. They're decent at it. They are not clever.

Things that reliably confuse them:

- **Multi-column layouts.** A parser reads in a linear order. Two columns can interleave
  into nonsense, so your 2021 job title ends up attached to your 2018 employer.
- **Text inside headers and footers.** Some parsers skip these entirely. Putting your
  phone number and email in a header is a genuinely common way to lose them.
- **Tables used for layout.** Same problem as columns, with more ways to go wrong.
- **Text rendered as an image.** A graphic of your skills section contains no text at all,
  as far as the parser is concerned. Same for a scanned PDF.
- **Invented section headings.** "Where I've Been" is charming. "Experience" is parseable.
  The parser is pattern-matching against headings it has seen before.
- **Unusual date formats.** "Summer '21 – present" is harder than "Jun 2021 – Present."

Notice what's missing from that list: fonts, colors, margins, one page versus two, and
whether you used a template. Those affect the human reading it. They don't meaningfully
affect the parse.

Also notice that nothing here rejects you. A bad parse doesn't trigger a rejection — it
produces a garbled record that's harder to find later. Which brings us to the part that
actually matters.

## Step two: it sits in a database until someone searches for it

This is the piece most advice skips, and it's the piece that explains everything else.

Your parsed resume goes into a pile with every other application. For a role at a
mid-sized company, that pile might be a few hundred deep. Nobody reads a few hundred
resumes top to bottom. Instead, a recruiter opens the system and searches — by keyword, by
title, by school, by years of experience, by whatever filters the tool exposes.

You are not being scored. You are being *searched for*. That's a completely different
game, and it has one clear implication: the way to win is to be findable using the words
the person searching would actually type.

Where would they get those words? From the job description they wrote.

That's the real, unglamorous reason tailoring works. Not because a scoring algorithm
rewards keyword density, but because a human being is typing terms into a search box, and
those terms come from the requirements list they just published. If the posting says
"Kubernetes" and your resume says "container orchestration," you are describing the same
experience in a vocabulary that won't match their query. You don't get filtered out. You
just never come up.

## The myth of the ATS rejection

"My resume was rejected by the ATS" is one of the most repeated sentences in job hunting,
and it's usually not what happened.

You've likely also seen a statistic claiming that some large majority of resumes are
rejected by these systems before a human ever sees them. It gets quoted everywhere and
traced to a primary source almost nowhere. Treat it the way you'd treat any number with no
study attached.

There are two real mechanisms behind rejections that feel automated, and neither is a robot
judging your resume's quality.

**Knockout questions.** These are the questions on the application form itself, not
anything in your resume. Are you authorized to work in this country? Do you have five
years of experience with this technology? Do you hold this specific certification? Answers
to these can genuinely filter you out automatically, because the employer configured them
to. If you're getting instant rejections, this is the far more likely cause, and it's
worth reading those form questions carefully before you answer them.

**Nobody searched for you.** The less dramatic explanation. Your resume parsed fine, went
into the database, and the recruiter's searches never surfaced it — either because your
vocabulary didn't match theirs, or because they filled the role from the first thirty
applications and never got deeper. This is enormously common and it feels exactly like
rejection from the outside.

Neither of these is a machine deciding you're not good enough. That's worth internalizing,
because the alternative story — an invisible algorithm judging you — is both more
demoralizing and less true.

## What to actually do

Here's what follows from all of the above, in rough order of how much it's worth.

**Mirror the posting's vocabulary.** If they say "applicant tracking system," don't only
write "ATS." If they say "PostgreSQL," don't only write "Postgres." Use both forms of the
important ones — the spelled-out version and the acronym — at least once each, naturally,
in a bullet where you actually did the thing. This is the single highest-value change you
can make.

**Check your title alignment.** Recruiters search by job title constantly. If your title
was "Member of Technical Staff" and the posting is for a "Backend Engineer," you are
invisible to the obvious search. You can't lie about your title, but you can add a clear
parenthetical, or make sure the target title appears in your summary line and in how you
describe the work.

**Read the knockout questions before the resume.** They do more filtering than anything
else in this article. If a role requires a certification you don't have, that's information
worth having before you spend 45 minutes tailoring.

**Use a single-column layout with standard headings.** Experience, Education, Skills. Save
the two-column design for the version you email directly to a human, if you want one at
all.

**Submit a text-based PDF unless told otherwise.** Not a scan, not an image, not a design
export that flattened your text. Open the file and try to select a line of text with your
cursor. If you can't, neither can the parser.

**Put your contact details in the body of the document**, not in the header or footer.

And a few things to stop doing:

**Stop keyword-stuffing.** White text, hidden keywords, and a wall of terms at the bottom
of the page. These do get found — by the recruiter who opens your resume, sees it, and now
knows you tried to game them. It's a bad trade on every axis.

**Stop chasing an "ATS score."** Various tools will give you a number out of 100. There is
no such number inside any real applicant tracking system. A score can be a useful proxy for
"how well does my wording overlap with this posting," which is a genuinely helpful thing to
measure. It is not a grade the employer sees.

**Stop worrying about fonts.** Use something readable. Move on.

## The part nobody can automate

Everything above is mechanics, and mechanics are the easy part. They get you findable.
They don't get you hired.

What actually moves a recruiter reading your resume is the same thing it's always been:
specific evidence that you've done work like the work they need. Numbers instead of
adjectives. "Cut deploy time from 40 minutes to 6" instead of "improved deployment
efficiency." The three bullets that map directly onto their top three requirements, sitting
at the top where a six-second skim will land.

Tailoring gets you into the search results. Substance is what happens after.

---

I built [Udaan](https://github.com/Pranavraut033/resume-builder) because doing all of the
above by hand for every application takes 45 minutes nobody has. It's a free, open-source
desktop app that tailors your resume to a job description, checks it for the keyword gaps,
knockout risks, and title mismatches described in this post, and keeps everything on your
own machine. If the checklist above was useful on its own, that was the point.
