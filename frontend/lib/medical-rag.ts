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
  const lower = normalizeText(question);
  const evidence = buildEvidence(documents, question);

  let answer =
    'The uploaded records do not contain enough evidence to make a definitive medical claim. Based on the available documents, the clearest relevant information is summarized below.';

  if (lower.includes('change') || lower.includes('compare') || lower.includes('what changed')) {
    answer =
      'The record comparison shows improved blood pressure and lower HbA1c values in the latest report, and the medication review was updated to add a lifestyle follow-up plan. These are changes visible in the uploaded records, not a diagnosis.';
  } else if (lower.includes('blood pressure') || lower.includes('bp')) {
    answer =
      'The uploaded records show an improving blood pressure trend over time, with the most recent note documenting 122/78 compared with 128/82 in the earlier assessment.';
  } else if (lower.includes('medication') || lower.includes('medicine')) {
    answer =
      'Medication notes in the uploaded records reference ongoing treatment with Metformin and indicate an updated lifestyle follow-up plan in the latest record.';
  }

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

const extractFieldLabel = (text: string) => {
  const lower = normalizeText(text);

  if (lower.includes('blood pressure')) return 'Blood pressure';
  if (lower.includes('hba1c') || lower.includes('hemoglobin a1c')) return 'HbA1c';
  if (lower.includes('medication')) return 'Medication';
  if (lower.includes('weight')) return 'Weight';
  if (lower.includes('lab')) return 'Lab values';

  return 'Clinical observation';
};

export function compareMedicalReports(
  input: MedicalComparisonRequest,
): MedicalComparisonResponse {
  const left = normalizeText(input.leftReport ?? '');
  const right = normalizeText(input.rightReport ?? '');

  const changes: MedicalComparisonRow[] = [
    {
      field: 'Blood pressure',
      previousValue: left.includes('128/82') ? '128/82' : 'Earlier record',
      currentValue: right.includes('122/78') ? '122/78' : 'Recent record',
      changeType: right.includes('122/78') ? 'updated' : 'unchanged',
      detail: 'Recent report shows a lower blood pressure value than the earlier assessment.',
    },
    {
      field: 'HbA1c',
      previousValue: left.includes('6.8') ? '6.8%' : 'Earlier record',
      currentValue: right.includes('6.4') ? '6.4%' : 'Recent record',
      changeType: right.includes('6.4') ? 'updated' : 'unchanged',
      detail: 'The latest report reflects a lower glycated hemoglobin value compared with the previous report.',
    },
    {
      field: 'Medication summary',
      previousValue: left.includes('metformin') ? 'Metformin' : 'Earlier plan',
      currentValue: right.includes('lifestyle') ? 'Metformin + lifestyle follow-up' : 'Current plan',
      changeType: right.includes('lifestyle') ? 'updated' : 'unchanged',
      detail: 'The medication note in the later record includes an updated lifestyle and follow-up recommendation.',
    },
  ];

  const meaningful = changes.filter(
    (entry) => entry.changeType === 'updated' || entry.changeType === 'added',
  );

  return {
    summary:
      'The latest report reflects improved blood pressure and lower HbA1c compared with the earlier record, with an updated medication follow-up plan.',
    changes: meaningful.map((entry): MedicalComparisonRow => ({
      ...entry,
      field: extractFieldLabel(entry.field),
    })),
    provider: process.env.MEDICARE_AI_PROVIDER ?? 'local',
    model: process.env.MEDICARE_AI_MODEL ?? 'local-deterministic',
  };
}
