export interface EvalCase {
  id: string;
  question: string;
  expectedDocumentIds: string[];
  expectedFacts: string[];
  shouldRefuse: boolean;
}

/**
 * Questions are written against the fictional Northline corpus.
 * expectedFacts are case-insensitive substrings the answer must contain.
 */
export const dataset: EvalCase[] = [
  {
    id: "rate-lock-term",
    question: "How long is a mortgage rate lock?",
    expectedDocumentIds: ["mortgage-terms"],
    expectedFacts: ["45 calendar days"],
    shouldRefuse: false,
  },
  {
    id: "rate-lock-extension",
    question: "What does a rate lock extension cost?",
    expectedDocumentIds: ["mortgage-terms"],
    expectedFacts: ["15 days", "0.125%"],
    shouldRefuse: false,
  },
  {
    id: "late-fee",
    question: "When is a mortgage payment late, and what is the late fee?",
    expectedDocumentIds: ["mortgage-terms"],
    expectedFacts: ["15 calendar days", "4%"],
    shouldRefuse: false,
  },
  {
    id: "fixed-prepayment",
    question: "Is there a prepayment penalty on a fixed-rate mortgage?",
    expectedDocumentIds: ["mortgage-terms"],
    expectedFacts: ["Fixed-rate mortgage loans have no prepayment penalty."],
    shouldRefuse: false,
  },
  {
    id: "arm-caps",
    question: "What are the periodic cap and lifetime cap on an adjustable-rate mortgage?",
    expectedDocumentIds: ["mortgage-terms"],
    expectedFacts: ["2 percentage points", "5 percentage points"],
    shouldRefuse: false,
  },
  {
    id: "checking-fee-waiver",
    question: "How is the Everyday Checking monthly fee waived?",
    expectedDocumentIds: ["checking-conditions"],
    expectedFacts: ["at least $1,500", "at least $500"],
    shouldRefuse: false,
  },
  {
    id: "opening-deposit",
    question: "What is the minimum opening deposit for an Everyday Checking account?",
    expectedDocumentIds: ["checking-conditions"],
    expectedFacts: ["Everyday Checking account is $25"],
    shouldRefuse: false,
  },
  {
    id: "savings-transfer",
    question:
      "How much does an overdraft protection transfer from a linked savings account cost?",
    expectedDocumentIds: ["checking-conditions"],
    expectedFacts: ["$10 per transfer"],
    shouldRefuse: false,
  },
  {
    id: "domestic-wire",
    question: "How much does an outgoing domestic wire cost?",
    expectedDocumentIds: ["fee-schedule"],
    expectedFacts: ["outgoing domestic wire costs $25"],
    shouldRefuse: false,
  },
  {
    id: "stop-payment",
    question:
      "How long does a stop payment request remain in effect, and what does it cost?",
    expectedDocumentIds: ["fee-schedule"],
    expectedFacts: ["6 months", "$30"],
    shouldRefuse: false,
  },
  {
    id: "cd-penalty-24",
    question: "What is the early withdrawal penalty for a 24-month certificate of deposit?",
    expectedDocumentIds: ["cd-disclosures"],
    expectedFacts: ["180 days of simple interest"],
    shouldRefuse: false,
  },
  {
    id: "cd-grace",
    question: "How long is the grace period after certificate of deposit maturity?",
    expectedDocumentIds: ["cd-disclosures"],
    expectedFacts: ["10 calendar days"],
    shouldRefuse: false,
  },
  {
    id: "overdraft-fee-cap",
    question:
      "What is the Northline fee per overdraft item, and how many overdraft fees can Northline charge per business day?",
    expectedDocumentIds: ["overdraft-policy"],
    expectedFacts: ["$35", "3 overdraft fees"],
    shouldRefuse: false,
  },
  {
    id: "overdraft-forty",
    question: "I am overdrawn by $40. Will Northline charge an overdraft fee?",
    expectedDocumentIds: ["overdraft-policy"],
    expectedFacts: ["$50 or less"],
    shouldRefuse: false,
  },
  {
    id: "bitcoin-custody",
    question: "What is Northline's bitcoin custody fee?",
    expectedDocumentIds: [],
    expectedFacts: [],
    shouldRefuse: true,
  },
  {
    id: "rewards-card",
    question: "What APR does the Northline rewards credit card charge?",
    expectedDocumentIds: [],
    expectedFacts: [],
    shouldRefuse: true,
  },
  {
    id: "chief-executive",
    question: "Who is the chief executive officer of Northline Bank?",
    expectedDocumentIds: [],
    expectedFacts: [],
    shouldRefuse: true,
  },
  {
    id: "harbor-wire",
    question: "What does Harbor National charge for an outgoing domestic wire?",
    expectedDocumentIds: [],
    expectedFacts: [],
    shouldRefuse: true,
  },
];
