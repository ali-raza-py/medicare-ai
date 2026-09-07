import type {
  MedicalAnswerRequest,
  MedicalAnswerResponse,
  MedicalComparisonRequest,
  MedicalComparisonRow,
  MedicalComparisonResponse,
  MedicalDocumentRecord,
  MedicalEvidence,
} from '@/types/medical';

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s/%.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getTokens = (value: string) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);

const asDocumentSummary = (document: MedicalDocumentRecord) =>
  [document.title, document.summary, document.type, document.date, document.content ?? '']
    .filter(Boolean)
    .join(' ');

export function retrieveRelevantDocuments(
  question: string,
  documents: MedicalDocumentRecord[],
  limit = 3,
) {
  const questionTokens = new Set(getTokens(question));

  return documents
    .map((document) => {
      const haystack = asDocumentSummary(document);
      const terms = getTokens(haystack);
      const matches = terms.filter((term) => questionTokens.has(term));
      const score = matches.length + (questionTokens.has(normalizeText(document.title)) ? 2 : 0);

      return { document, score, matches };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ document, matches, score }) => ({
      document,
      matches,
      score,
    }));
}

const buildEvidence = (
  documents: MedicalDocumentRecord[],
  question: string,
): MedicalEvidence[] => {
  const relevant = retrieveRelevantDocuments(question, documents, 3);

  return relevant.map(({ document }) => ({
    documentName: document.title,
    section: document.type,
    sourceId: document.id,
    snippet: document.summary,
    score: 0.9,
  }));
};

const makeLocalMedicalAnswer = (
  question: string,
  documents: MedicalDocumentRecord[],
): MedicalAnswerResponse => {
  const evidence = buildEvidence(documents, question);

  const answer = evidence.length > 0
    ? `The available records contain relevant text, but this local helper does not interpret medical findings. Review the cited excerpts with a qualified clinician.\n\n${evidence.map((item) => item.snippet).join('\n\n')}`
    : 'The uploaded records do not contain enough evidence to answer this question. Please upload a relevant document or consult a qualified clinician.';

  return {
    answer,
    evidence,
    confidence: 'High',
    sourceCount: evidence.length,
  };
};

export function generateMedicalAnswer(
  input: MedicalAnswerRequest,
): MedicalAnswerResponse {
  const provider = process.env.MEDICARE_AI_PROVIDER ?? 'local';
  const model = process.env.MEDICARE_AI_MODEL ?? 'local-deterministic';

  if (provider === 'local' || !process.env.MEDICARE_AI_API_KEY) {
    return {
      ...makeLocalMedicalAnswer(input.question, input.documents ?? []),
      provider,
      model,
    };
  }

  return {
    answer:
      'A configured remote AI provider is enabled, but no live provider call was executed in this local environment. The request is routed through the project API layer and may be completed by your deployed backend when the provider credentials are available.',
    evidence: buildEvidence(input.documents ?? [], input.question),
    confidence: 'Medium',
    sourceCount: buildEvidence(input.documents ?? [], input.question).length,
    provider,
    model,
  };
}

export function compareMedicalReports(
  input: MedicalComparisonRequest,
): MedicalComparisonResponse {
  const leftLines = (input.leftReport ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rightLines = (input.rightReport ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const same = leftLines.join('\n') === rightLines.join('\n');
  const meaningful: MedicalComparisonRow[] = same
    ? [{
        field: 'Document text',
        previousValue: 'No textual difference detected',
        currentValue: 'No textual difference detected',
        changeType: 'unchanged',
        detail: 'No textual difference was detected in the extracted report text.',
      }]
    : [{
        field: 'Document text',
        previousValue: leftLines.slice(0, 3).join(' ') || 'Not present in earlier report',
        currentValue: rightLines.slice(0, 3).join(' ') || 'Not present in current report',
        changeType: 'updated',
        detail: 'Text differs between the two uploaded reports. Review the source reports with a clinician for interpretation.',
      }];

  return {
    summary:
      'Comparison completed using extracted text from both uploaded reports. Differences are shown without clinical interpretation.',
    changes: meaningful,
    provider: process.env.MEDICARE_AI_PROVIDER ?? 'local',
    model: process.env.MEDICARE_AI_MODEL ?? 'local-deterministic',
  };
}
